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
