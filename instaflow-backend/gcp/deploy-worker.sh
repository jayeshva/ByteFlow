#!/bin/bash

# Deploy InstaFlow Worker to Cloud Run
# Usage: ./deploy-worker.sh

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-project-663d250c-5cb4-409d-a94}"
REGION="${GCP_REGION:-asia-south1}"
SERVICE_NAME="instaflow-worker"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Deploying InstaFlow Worker to Cloud Run"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/.."

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t $IMAGE_NAME:latest -f Dockerfile.worker .

# Push to GCR
echo "📤 Pushing to Container Registry..."
docker push $IMAGE_NAME:latest

# Deploy to Cloud Run
echo "☁️ Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME:latest \
  --region $REGION \
  --project $PROJECT_ID \
  --platform managed \
  --no-allow-unauthenticated \
  --min-instances 1 \
  --max-instances 5 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --set-env-vars "RUN_MODE=cloud,NODE_ENV=production,GCP_PROJECT_ID=$PROJECT_ID,PUBSUB_SUBSCRIPTION=instagram-webhooks-sub"

echo ""
echo "✅ Worker deployed successfully!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Service: $SERVICE_NAME"
echo "🌍 Region: $REGION"
echo ""
echo "📝 View logs:"
echo "   gcloud run logs read --service $SERVICE_NAME --region $REGION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
