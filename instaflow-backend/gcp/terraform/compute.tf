# Cloud Run API Service
resource "google_cloud_run_v2_service" "api" {
  name     = "instaflow-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.api_sa.email
    
    # VPC Connector for accessing Redis Memorystore
    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    # Cloud SQL Connection
    cloud_sql_instance = [google_sql_database_instance.postgres.connection_name]

    containers {
      image = "gcr.io/${var.project_id}/instaflow-api:latest"
      
      ports {
        container_port = 8080
      }

      env {
        name  = "RUN_MODE"
        value = "cloud"
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "FRONTEND_URL"
        value = var.frontend_url
      }
      env {
        name  = "IG_REDIRECT_URI"
        value = "https://${var.frontend_url}/auth-callback" # Example derived value
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql://instaflow:${var.db_password}@localhost/instaflow?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
      }
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "JWT_REFRESH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_refresh_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.ig_client_id.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.ig_client_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "DODO_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.dodo_api_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "CASHFREE_APP_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.cashfree_app_id.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "CASHFREE_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.cashfree_secret_key.secret_id
            version = "latest"
          }
        }
      }

      # Redis Memorystore configuration
      env {
        name  = "REDIS_HOST"
        value = google_redis_instance.cache.host
      }
      env {
        name  = "REDIS_PORT"
        value = tostring(google_redis_instance.cache.port)
      }

      # Pub/Sub configuration
      env {
        name  = "PUBSUB_TOPIC"
        value = google_pubsub_topic.webhook_topic.name
      }

      # Webhook verification token
      env {
        name = "IG_WEBHOOK_VERIFY_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.ig_webhook_verify_token.secret_id
            version = "latest"
          }
        }
      }

      # Master encryption key for token encryption
      env {
        name = "MASTER_ENCRYPTION_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.master_encryption_key.secret_id
            version = "latest"
          }
        }
      }
    }
  }
}

# Cloud Run Worker Service
resource "google_cloud_run_v2_service" "worker" {
  name     = "instaflow-worker"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = google_service_account.worker_sa.email
    max_instance_request_concurrency = 1
    
    # VPC Connector for accessing Redis Memorystore
    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    # Cloud SQL Connection
    cloud_sql_instance = [google_sql_database_instance.postgres.connection_name]

    containers {
      image = "gcr.io/${var.project_id}/instaflow-worker:latest"
      
      env {
        name  = "RUN_MODE"
        value = "cloud"
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "PUBSUB_SUBSCRIPTION"
        value = google_pubsub_subscription.webhook_subscription.name
      }
      
      env {
        name  = "DATABASE_URL"
        value = "postgresql://instaflow:${var.db_password}@localhost/instaflow?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
      }
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "JWT_REFRESH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_refresh_secret.secret_id
            version = "latest"
          }
        }
      }

      # Redis Memorystore configuration
      env {
        name  = "REDIS_HOST"
        value = google_redis_instance.cache.host
      }
      env {
        name  = "REDIS_PORT"
        value = tostring(google_redis_instance.cache.port)
      }

      # Pub/Sub configuration
      env {
        name  = "PUBSUB_TOPIC"
        value = google_pubsub_topic.webhook_topic.name
      }

      # Master encryption key for token encryption
      env {
        name = "MASTER_ENCRYPTION_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.master_encryption_key.secret_id
            version = "latest"
          }
        }
      }
    }
  }
}

# Allow unauthenticated access to API
resource "google_cloud_run_v2_service_iam_member" "api_public" {
  location = google_cloud_run_v2_service.api.location
  project  = google_cloud_run_v2_service.api.project
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
