# Service Account for API
resource "google_service_account" "api_sa" {
  account_id   = "instaflow-api-sa"
  display_name = "Service Account for InstaFlow API"
}

# Service Account for Worker
resource "google_service_account" "worker_sa" {
  account_id   = "instaflow-worker-sa"
  display_name = "Service Account for InstaFlow Worker"
}

# Permissions for API
resource "google_project_iam_member" "api_db_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

resource "google_project_iam_member" "api_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "api_secrets_accessor" {
  for_each = toset([
    "DATABASE_URL",
    "JWT_SECRET",
    "IG_CLIENT_ID",
    "IG_CLIENT_SECRET",
    "JWT_REFRESH_SECRET",
    "DODO_API_KEY",
    "CASHFREE_APP_ID",
    "CASHFREE_SECRET_KEY",
    "IG_WEBHOOK_VERIFY_TOKEN",
    "MASTER_ENCRYPTION_KEY"
  ])
  secret_id = each.key
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api_sa.email}"
}

# Permissions for Worker
resource "google_project_iam_member" "worker_db_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.worker_sa.email}"
}

resource "google_project_iam_member" "worker_pubsub_subscriber" {
  project = var.project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.worker_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "worker_secrets_accessor" {
  for_each = toset([
    "DATABASE_URL",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "MASTER_ENCRYPTION_KEY"
  ])
  secret_id = each.key
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.worker_sa.email}"
}
