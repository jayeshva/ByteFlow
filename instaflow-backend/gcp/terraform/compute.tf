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
        name  = "INSTANCE_CONNECTION_NAME"
        value = google_sql_database_instance.postgres.connection_name
      }
      env {
        name  = "DB_USER"
        value = trimsuffix(google_service_account.api_sa.email, ".gserviceaccount.com")
      }
      env {
        name  = "DB_NAME"
        value = "instaflow"
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

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_url.secret_id
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

      # SMTP Configuration
      env {
        name  = "SMTP_HOST"
        value = var.smtp_host
      }
      env {
        name  = "SMTP_PORT"
        value = tostring(var.smtp_port)
      }
      env {
        name  = "SMTP_FROM"
        value = var.smtp_from
      }
      env {
        name = "SMTP_USER"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.smtp_user.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "SMTP_PASS"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.smtp_pass.secret_id
            version = "latest"
          }
        }
      }

      # Google OAuth Configuration
      env {
        name = "GOOGLE_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.google_client_id.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "GOOGLE_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.google_client_secret.secret_id
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres.connection_name]
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_iam_member.api_secrets_accessor,
    google_secret_manager_secret_version.smtp_pass_v1,
    google_secret_manager_secret_version.smtp_user_v1,
    google_secret_manager_secret_version.google_client_id_v1,
    google_secret_manager_secret_version.google_client_secret_v1
  ]
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
        name  = "INSTANCE_CONNECTION_NAME"
        value = google_sql_database_instance.postgres.connection_name
      }
      env {
        name  = "DB_USER"
        value = trimsuffix(google_service_account.worker_sa.email, ".gserviceaccount.com")
      }
      env {
        name  = "DB_NAME"
        value = "instaflow"
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

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_url.secret_id
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

        # SMTP Configuration
      env {
        name  = "SMTP_HOST"
        value = var.smtp_host
      }
      env {
        name  = "SMTP_PORT"
        value = tostring(var.smtp_port)
      }
      env {
        name  = "SMTP_FROM"
        value = var.smtp_from
      }
      env {
        name = "SMTP_USER"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.smtp_user.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "SMTP_PASS"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.smtp_pass.secret_id
            version = "latest"
          }
        }
      }

      # Google OAuth Configuration
      env {
        name = "GOOGLE_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.google_client_id.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "GOOGLE_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.google_client_secret.secret_id
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres.connection_name]
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_iam_member.worker_secrets_accessor,
    google_secret_manager_secret_version.smtp_pass_v1,
    google_secret_manager_secret_version.smtp_user_v1,
    google_secret_manager_secret_version.google_client_id_v1,
    google_secret_manager_secret_version.google_client_secret_v1
  ]
}

# Allow unauthenticated access to API
resource "google_cloud_run_v2_service_iam_member" "api_public" {
  location = google_cloud_run_v2_service.api.location
  project  = google_cloud_run_v2_service.api.project
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
