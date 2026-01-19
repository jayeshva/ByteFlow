#!/bin/bash

# Deploy Instagram Webhook Cloud Function to GCP
# Usage: ./deploy-webhook.sh

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-project-663d250c-5cb4-409d-a94}"
REGION="${GCP_REGION:-asia-south1}"
FUNCTION_NAME="instagram-webhook"
PUBSUB_TOPIC="instagram-webhooks"
VERIFY_TOKEN="${INSTAGRAM_VERIFY_TOKEN:-instaflow_verify_token_2024}"

echo "🚀 Deploying Instagram Webhook Function"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo ""

# Navigate to function directory
cd "$(dirname "$0")/webhook-function"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npx tsc

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudfunctions.googleapis.com pubsub.googleapis.com --project=$PROJECT_ID

# Create Pub/Sub topic if not exists
echo "📬 Ensuring Pub/Sub topic exists..."
gcloud pubsub topics describe $PUBSUB_TOPIC --project=$PROJECT_ID 2>/dev/null || \
  gcloud pubsub topics create $PUBSUB_TOPIC --project=$PROJECT_ID

# Create Pub/Sub subscription if not exists
echo "📬 Ensuring Pub/Sub subscription exists..."
gcloud pubsub subscriptions describe ${PUBSUB_TOPIC}-sub --project=$PROJECT_ID 2>/dev/null || \
  gcloud pubsub subscriptions create ${PUBSUB_TOPIC}-sub \
    --topic=$PUBSUB_TOPIC \
    --ack-deadline=60 \
    --message-retention-duration=7d \
    --project=$PROJECT_ID

# Deploy Cloud Function
echo "☁️ Deploying Cloud Function..."
gcloud functions deploy $FUNCTION_NAME \
  --gen2 \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point instagramWebhook \
  --region $REGION \
  --project $PROJECT_ID \
  --source . \
  --memory 256MB \
  --timeout 60s \
  --set-env-vars "GCP_PROJECT_ID=$PROJECT_ID,PUBSUB_TOPIC=$PUBSUB_TOPIC,INSTAGRAM_VERIFY_TOKEN=$VERIFY_TOKEN"

# Get function URL
FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME --region $REGION --project $PROJECT_ID --format='value(serviceConfig.uri)')

echo ""
echo "✅ Deployment complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Webhook URL:"
echo "   $FUNCTION_URL"
echo ""
echo "🔑 Verify Token:"
echo "   $VERIFY_TOKEN"
echo ""
echo "📝 Next Steps:"
echo "   1. Go to Meta Developer Console"
echo "   2. Update Instagram Webhook settings:"
echo "      - Callback URL: $FUNCTION_URL"
echo "      - Verify Token: $VERIFY_TOKEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
