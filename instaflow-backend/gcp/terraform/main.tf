terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable APIs
resource "google_project_service" "services" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "pubsub.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "servicenetworking.googleapis.com",
    "redis.googleapis.com",        # Cloud Memorystore
    "vpcaccess.googleapis.com",    # VPC Access Connector for Cloud Run
    "compute.googleapis.com",      # Compute Engine for VM Worker
    "cloudresourcemanager.googleapis.com" # Required for some gcloud commands to verify projects
  ])
  service            = each.key
  disable_on_destroy = false
}
