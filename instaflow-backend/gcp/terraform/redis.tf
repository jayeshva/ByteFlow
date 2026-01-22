# Cloud Memorystore (Redis) for rate limiting and BullMQ
# Reference: https://cloud.google.com/memorystore/docs/redis

resource "google_redis_instance" "cache" {
  name               = "instaflow-redis"
  memory_size_gb     = 1
  region             = var.region
  redis_version      = "REDIS_7_0"
  tier               = "BASIC"  # Use "STANDARD_HA" for high availability

  # Connect to our VPC
  authorized_network = google_compute_network.vpc.id

  # Maintenance window (optional, but recommended)
  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
      }
    }
  }

  labels = {
    environment = "production"
    app         = "instaflow"
  }

  depends_on = [google_service_networking_connection.private_vpc_connection]
}

# VPC Access Connector for Cloud Run → Memorystore connectivity
resource "google_vpc_access_connector" "connector" {
  name          = "instaflow-vpc-connector"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.8.0.0/28"  # Must not overlap with other ranges
  
  # Throughput settings
  min_throughput = 200  # Minimum Mbps
  max_throughput = 300  # Maximum Mbps (can go up to 1000)
}

# Output the Redis host for reference
output "redis_host" {
  description = "The IP address of the Redis instance"
  value       = google_redis_instance.cache.host
}

output "redis_port" {
  description = "The port of the Redis instance"
  value       = google_redis_instance.cache.port
}

output "vpc_connector_name" {
  description = "The VPC connector name for Cloud Run"
  value       = google_vpc_access_connector.connector.name
}
