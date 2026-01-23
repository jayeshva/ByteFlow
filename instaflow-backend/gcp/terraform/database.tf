resource "google_sql_database_instance" "postgres" {
  name             = "instaflow-db-instance"
  database_version = "POSTGRES_15"
  region           = var.region

  depends_on = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier = "db-f1-micro"
    ip_configuration {
      ipv4_enabled    = true # Enabled for easy management, normally private only
      private_network = google_compute_network.vpc.id
    }
    backup_configuration {
      enabled = true
    }

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }
  }
}

resource "google_sql_database" "database" {
  name     = "instaflow"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "users" {
  name     = "instaflow"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

# IAM DB Users for each service account
resource "google_sql_user" "api_iam_user" {
  name     = trimsuffix(google_service_account.api_sa.email, ".gserviceaccount.com")
  instance = google_sql_database_instance.postgres.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
}

resource "google_sql_user" "worker_iam_user" {
  name     = trimsuffix(google_service_account.worker_sa.email, ".gserviceaccount.com")
  instance = google_sql_database_instance.postgres.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
}

resource "google_sql_user" "vm_worker_iam_user" {
  name     = trimsuffix(google_service_account.vm_worker_sa.email, ".gserviceaccount.com")
  instance = google_sql_database_instance.postgres.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
}
