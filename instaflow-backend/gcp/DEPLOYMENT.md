# GCP Deployment Guide for InstaFlow

## Prerequisites

1. GCP Project with billing enabled
2. gcloud CLI installed and authenticated
3. Docker installed (for local testing)

## Initial Setup

### 1. Enable Required APIs

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  pubsub.googleapis.com \
  cloudfunctions.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com
```

### 2. Create Pub/Sub Topic and Subscription

```bash
# Create topic
gcloud pubsub topics create instagram-webhooks

# Create subscription with 7-day retention
gcloud pubsub subscriptions create instagram-webhooks-sub \
  --topic=instagram-webhooks \
  --ack-deadline=60 \
  --message-retention-duration=7d \
  --min-retry-delay=10s \
  --max-retry-delay=600s
```

### 3. Create Cloud SQL Instance (PostgreSQL)

```bash
# Create instance (smallest tier)
gcloud sql instances create instaflow-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-south1 \
  --storage-size=10GB \
  --storage-type=SSD

# Create database
gcloud sql databases create instaflow --instance=instaflow-db

# Create user
gcloud sql users create instaflow \
  --instance=instaflow-db \
  --password=YOUR_SECURE_PASSWORD
```

### 4. Store Secrets

```bash
# Create secrets
echo -n "your-jwt-secret" | gcloud secrets create JWT_SECRET --data-file=-
echo -n "your-ig-client-id" | gcloud secrets create CLIENT_ID --data-file=-
echo -n "your-ig-client-secret" | gcloud secrets create CLIENT_SECRET --data-file=-
# Add more secrets as needed
```

## Deploy Cloud Function (Webhook Receiver)

```bash
cd gcp/webhook-function
npm install
npm run deploy

# Or manually:
gcloud functions deploy instagram-webhook \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point instagramWebhook \
  --region asia-south1 \
  --set-env-vars GCP_PROJECT_ID=YOUR_PROJECT,PUBSUB_TOPIC=instagram-webhooks,INSTAGRAM_VERIFY_TOKEN=your-token
```

**Update Instagram App Settings:**
- Set Webhook URL to: `https://asia-south1-YOUR_PROJECT.cloudfunctions.net/instagram-webhook`
- Set Verify Token to match `INSTAGRAM_VERIFY_TOKEN`

## Deploy Cloud Run Services

### Build and Push Images

```bash
# From instaflow-backend directory
cd /path/to/instaflow-backend

# Build API
docker build -t gcr.io/YOUR_PROJECT/instaflow-api:latest -f Dockerfile.api .
docker push gcr.io/YOUR_PROJECT/instaflow-api:latest

# Build Worker
docker build -t gcr.io/YOUR_PROJECT/instaflow-worker:latest -f Dockerfile.worker .
docker push gcr.io/YOUR_PROJECT/instaflow-worker:latest
```

### Deploy API Service

```bash
gcloud run deploy instaflow-api \
  --image gcr.io/YOUR_PROJECT/instaflow-api:latest \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --port 8080 \
  --add-cloudsql-instances YOUR_PROJECT:asia-south1:instaflow-db \
  --set-env-vars "RUN_MODE=cloud,NODE_ENV=production,GCP_PROJECT_ID=YOUR_PROJECT,PUBSUB_TOPIC=instagram-webhooks" \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,CLIENT_ID=CLIENT_ID:latest,CLIENT_SECRET=CLIENT_SECRET:latest"
```

### Deploy Worker Service

```bash
gcloud run deploy instaflow-worker \
  --image gcr.io/YOUR_PROJECT/instaflow-worker:latest \
  --region asia-south1 \
  --platform managed \
  --no-allow-unauthenticated \
  --min-instances 1 \
  --max-instances 5 \
  --memory 512Mi \
  --cpu 1 \
  --add-cloudsql-instances YOUR_PROJECT:asia-south1:instaflow-db \
  --set-env-vars "RUN_MODE=cloud,NODE_ENV=production,GCP_PROJECT_ID=YOUR_PROJECT,PUBSUB_SUBSCRIPTION=instagram-webhooks-sub" \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest"
```

## Environment Variables

### Required for Cloud Run

```env
# Mode
RUN_MODE=cloud
NODE_ENV=production

# GCP
GCP_PROJECT_ID=your-project-id
PUBSUB_TOPIC=instagram-webhooks
PUBSUB_SUBSCRIPTION=instagram-webhooks-sub

# Database (Cloud SQL)
DATABASE_URL=postgresql://user:pass@/dbname?host=/cloudsql/project:region:instance

# App Secrets (use Secret Manager)
JWT_SECRET=your-jwt-secret
CLIENT_ID=instagram-client-id
CLIENT_SECRET=instagram-client-secret

# Payment Providers
DODO_API_KEY=your-dodo-key
CASHFREE_APP_ID=your-cashfree-id
CASHFREE_SECRET_KEY=your-cashfree-secret
CASHFREE_ENVIRONMENT=PROD
```

## Automatic Deployments (CI/CD)

Connect Cloud Build to your GitHub repository:

```bash
# Trigger on push to main branch
gcloud builds triggers create github \
  --repo-name=ByteFlow \
  --repo-owner=your-github-username \
  --branch-pattern="^main$" \
  --build-config=gcp/cloudbuild.yaml
```

## Cost Optimization Tips

1. **Cloud Run**: Set `--min-instances 0` for API to scale to zero when idle
2. **Cloud SQL**: Use `db-f1-micro` tier for small workloads
3. **Pub/Sub**: Pay only for messages processed (~$0.04/million)
4. **Cloud Functions**: First 2M invocations/month are free

## Monitoring

```bash
# View API logs
gcloud run logs read --service instaflow-api --region asia-south1

# View Worker logs
gcloud run logs read --service instaflow-worker --region asia-south1

# View Cloud Function logs
gcloud functions logs read instagram-webhook --region asia-south1
```

## Estimated Monthly Cost

| Service | Specification | Cost |
|---------|--------------|------|
| Cloud Run (API) | 0-10 instances | ~$10-30 |
| Cloud Run (Worker) | 1-5 instances | ~$15-30 |
| Cloud Functions | Webhook receiver | ~$1 |
| Pub/Sub | Message queue | ~$1-5 |
| Cloud SQL | db-f1-micro | ~$7-15 |
| **Total** | | **~$35-80/month** |
