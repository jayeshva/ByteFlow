# Webhook Events Topic
resource "google_pubsub_topic" "webhook_topic" {
  name = "instagram-webhooks"
}

# Webhook Events Subscription
resource "google_pubsub_subscription" "webhook_subscription" {
  name  = "instagram-webhooks-sub"
  topic = google_pubsub_topic.webhook_topic.name

  ack_deadline_seconds = 60

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}
