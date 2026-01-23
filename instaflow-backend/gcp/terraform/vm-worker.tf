# Compute Engine VM for continuous worker processing
# Handles BullMQ retry queue polling (Cloud Run can't do this when scaled to 0)

# Storage bucket for worker artifacts
resource "google_storage_bucket" "artifacts" {
  name          = "${var.project_id}-instaflow-artifacts"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true
}

# Startup script to run the worker using Docker
locals {
  worker_startup_script = <<-EOF
    #!/bin/bash
    set -e
    
    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
      curl -fsSL https://get.docker.com | sh
      systemctl enable docker
      systemctl start docker
    fi
    
    # Install Cloud SQL Auth Proxy
    if ! command -v cloud-sql-proxy &> /dev/null; then
      curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.1/cloud-sql-proxy.linux.amd64
      chmod +x cloud-sql-proxy
      mv cloud-sql-proxy /usr/local/bin/
    fi

    # Stop existing proxy if running
    pkill cloud-sql-proxy || true

    # Start Cloud SQL Auth Proxy in background
    # Note: --address 0.0.0.0 allows docker containers to connect if not on host network, 
    # but we will use 127.0.0.1 and --network host for simplicity if possible, 
    # or just --address 0.0.0.0 and use the host IP.
    cloud-sql-proxy --address 0.0.0.0 --port 5432 ${google_sql_database_instance.postgres.connection_name} &

    # Pull and run the worker container
    gcloud auth configure-docker gcr.io --quiet
    docker pull gcr.io/${var.project_id}/instaflow-worker:latest
    
    # Run the worker with environment variables
    # We use the internal IP of the VM to connect to the proxy running on the host
    VM_IP=$(hostname -I | awk '{print $1}')
    
    docker stop instaflow-worker || true
    docker rm instaflow-worker || true
    
    docker run -d \
      --name instaflow-worker \
      --restart always \
      -e RUN_MODE=local \
      -e NODE_ENV=production \
      -e REDIS_HOST=${google_redis_instance.cache.host} \
      -e REDIS_PORT=${google_redis_instance.cache.port} \
      -e GCP_PROJECT_ID=${var.project_id} \
      -e DATABASE_URL="postgresql://instaflow:${var.db_password}@$VM_IP:5432/instaflow" \
      -e JWT_SECRET="$(gcloud secrets versions access latest --secret=JWT_SECRET)" \
      -e JWT_REFRESH_SECRET="$(gcloud secrets versions access latest --secret=JWT_REFRESH_SECRET)" \
      -e MASTER_ENCRYPTION_KEY="$(gcloud secrets versions access latest --secret=MASTER_ENCRYPTION_KEY)" \
      gcr.io/${var.project_id}/instaflow-worker:latest
  EOF
}

# Service account for the VM
resource "google_service_account" "vm_worker_sa" {
  account_id   = "instaflow-vm-worker"
  display_name = "InstaFlow VM Worker Service Account"
}

# Grant required roles to VM service account
resource "google_project_iam_member" "vm_worker_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.vm_worker_sa.email}"
}

resource "google_project_iam_member" "vm_worker_storage_viewer" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.vm_worker_sa.email}"
}

resource "google_project_iam_member" "vm_worker_registry_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.vm_worker_sa.email}"
}

resource "google_project_iam_member" "vm_worker_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.vm_worker_sa.email}"
}

# Compute Engine instance for worker
resource "google_compute_instance" "worker_vm" {
  name         = "instaflow-worker-vm"
  machine_type = "e2-small"  # ~$13/month, upgrade to e2-medium if needed
  zone         = "${var.region}-a"

  tags = ["instaflow-worker"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 20  # GB
    }
  }

  network_interface {
    network    = google_compute_network.vpc.id
    subnetwork = google_compute_subnetwork.subnet.id
    
    # No external IP - uses Cloud NAT for outbound
    # access_config {} # Uncomment for external IP
  }

  service_account {
    email  = google_service_account.vm_worker_sa.email
    scopes = ["cloud-platform"]
  }

  metadata_startup_script = local.worker_startup_script

  labels = {
    environment = "production"
    app         = "instaflow"
    component   = "worker"
  }

  # Allow stopping for cost optimization
  scheduling {
    preemptible       = false  # Set to true for ~60% cost savings (but can be stopped)
    automatic_restart = true
  }
}

# Firewall rule to allow internal traffic
resource "google_compute_firewall" "worker_internal" {
  name    = "instaflow-worker-internal"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22", "8080"]
  }

  source_ranges = ["10.0.0.0/8", "35.235.240.0/20"]  # Internal VPC traffic + Google IAP range
  target_tags   = ["instaflow-worker"]
}

# Cloud NAT for outbound internet access (required for Instagram API calls)
resource "google_compute_router" "router" {
  name    = "instaflow-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name   = "instaflow-nat"
  router = google_compute_router.router.name
  region = var.region

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = false
    filter = "ERRORS_ONLY"
  }
}

# Output the VM internal IP
output "worker_vm_internal_ip" {
  description = "Internal IP of the worker VM"
  value       = google_compute_instance.worker_vm.network_interface[0].network_ip
}
