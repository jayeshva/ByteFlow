#!/bin/bash

# End-to-End Provisioning and Deployment Script for InstaFlow
# 
# This script:
# 1. Provisions infrastructure using Terraform
# 2. Builds and pushes Docker images
# 3. Deploys services and functions

set -e

# --- Source Deployment Environment ---
if [ -f "$(dirname "$0")/.env.deploy" ]; then
  echo "📄 Sourcing environment from .env.deploy..."
  set -a
  source "$(dirname "$0")/.env.deploy"
  set +a
fi

# --- Configuration ---
PROJECT_ID="${GCP_PROJECT_ID}"
REGION="${GCP_REGION:-asia-south1}"

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: GCP_PROJECT_ID environment variable is not set."
  exit 1
fi

REQUIRED_VARS=(
  "DB_PASSWORD"
  "JWT_SECRET"
  "JWT_REFRESH_SECRET"
  "IG_CLIENT_ID"
  "IG_CLIENT_SECRET"
  "IG_WEBHOOK_VERIFY_TOKEN"
  "FRONTEND_URL"
  "DODO_API_KEY"
  "CASHFREE_APP_ID"
  "CASHFREE_SECRET_KEY"
)

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "❌ Error: $VAR environment variable is not set."
    MISSING_VARS=1
  fi
done

if [ "$MISSING_VARS" == "1" ]; then
  echo "Please set all required environment variables before running this script."
  exit 1
fi

echo "🚀 Starting End-to-End Deployment for project: $PROJECT_ID"

# 1. Infrastructure Provisioning
echo "🏗️ Step 1: Provisioning Infrastructure with Terraform..."
cd gcp/terraform
terraform init
terraform apply \
  -var="project_id=$PROJECT_ID" \
  -var="region=$REGION" \
  -var="db_password=$DB_PASSWORD" \
  -var="jwt_secret=$JWT_SECRET" \
  -var="jwt_refresh_secret=$JWT_REFRESH_SECRET" \
  -var="ig_client_id=$IG_CLIENT_ID" \
  -var="ig_client_secret=$IG_CLIENT_SECRET" \
  -var="ig_webhook_verify_token=$IG_WEBHOOK_VERIFY_TOKEN" \
  -var="frontend_url=$FRONTEND_URL" \
  -var="dodo_api_key=$DODO_API_KEY" \
  -var="cashfree_app_id=$CASHFREE_APP_ID" \
  -var="cashfree_secret_key=$CASHFREE_SECRET_KEY" \
  -auto-approve
cd ../..

# 2. Build and Push Images using Cloud Build
echo "🔨 Step 2: Building Images using Google Cloud Build..."
# This uses the cloudbuild.yaml in the root directory
gcloud builds submit --config cloudbuild.yaml --substitutions=_PROJECT_ID=$PROJECT_ID --project=$PROJECT_ID

# 3. Deploy Cloud Function
echo "☁️ Step 3: Deploying Cloud Function..."
./gcp/deploy-webhook.sh

# 4. Trigger Initial Cloud Run Deployment (to pick up new images)
echo "🚀 Step 4: Finalizing Cloud Run Deployment..."
gcloud run deploy instaflow-api --image gcr.io/$PROJECT_ID/instaflow-api:latest --region $REGION --project $PROJECT_ID
gcloud run deploy instaflow-worker --image gcr.io/$PROJECT_ID/instaflow-worker:latest --region $REGION --project $PROJECT_ID

echo "✅ End-to-End Deployment Successful!"
