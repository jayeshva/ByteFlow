#!/bin/bash
# Import existing GCP resources into Terraform state
# Run this ONCE before terraform apply if resources already exist

set -e

# Detect Project ID from state or tfvars
if [ -f "terraform.tfvars" ]; then
  PROJECT_ID=$(grep 'project_id' terraform.tfvars | cut -d'"' -f2)
fi

if [ -z "$PROJECT_ID" ]; then
  echo "🔍 Project ID not found in terraform.tfvars, attempting to detect from state..."
  # Try to find "project": "..." first
  PROJECT_ID=$(grep -m 1 "\"project\":" terraform.tfstate | cut -d'"' -f4 || echo "")
  
  # Fallback to projects/... if it's in a URL/ID format
  if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(grep -m 1 "projects/" terraform.tfstate | grep -o "projects/[^/]*" | head -1 | cut -d'/' -f2 || echo "")
  fi
fi

if [ -z "$PROJECT_ID" ]; then
  PROJECT_ID="project-663d250c-5cb4-409d-a94" # Hardcoded fallback from observation
fi

echo "🔄 Importing existing resources for project: $PROJECT_ID"

# Function to import a resource without failing if it's missing or already imported
import_resource() {
  local type=$1
  local name=$2
  local id=$3
  echo "📥 Importing $type.$name..."
  # We use -var to satisfy required variables that might be needed for provider initialization
  terraform import -var="project_id=$PROJECT_ID" -var="db_password=dummy" -var="jwt_secret=dummy" \
    -var="ig_client_id=dummy" -var="ig_client_secret=dummy" -var="ig_webhook_verify_token=dummy" \
    -var="jwt_refresh_secret=dummy" -var="dodo_api_key=dummy" -var="cashfree_app_id=dummy" \
    -var="cashfree_secret_key=dummy" -var="frontend_url=dummy" -var="master_encryption_key=dummy" \
    "$type.$name" "$id" || echo "⚠️  Skipping $name (maybe already imported or not found)"
}

# Import Pub/Sub Topic
import_resource "google_pubsub_topic" "webhook_topic" "projects/$PROJECT_ID/topics/instagram-webhooks"

# Import Secrets
SECRETS=(
  "DATABASE_URL:db_url"
  "JWT_SECRET:jwt_secret"
  "JWT_REFRESH_SECRET:jwt_refresh_secret"
  "IG_CLIENT_ID:ig_client_id"
  "IG_CLIENT_SECRET:ig_client_secret"
  "IG_WEBHOOK_VERIFY_TOKEN:ig_webhook_verify_token"
  "DODO_API_KEY:dodo_api_key"
  "CASHFREE_APP_ID:cashfree_app_id"
  "CASHFREE_SECRET_KEY:cashfree_secret_key"
  "MASTER_ENCRYPTION_KEY:master_encryption_key"
)

for secret in "${SECRETS[@]}"; do
  SECRET_NAME="${secret%%:*}"
  TF_NAME="${secret##*:}"
  import_resource "google_secret_manager_secret" "$TF_NAME" "projects/$PROJECT_ID/secrets/$SECRET_NAME"
done

echo "✅ Import complete. Now run: terraform apply"
