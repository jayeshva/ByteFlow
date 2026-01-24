# Database URL Secret
resource "google_secret_manager_secret" "db_url" {
  secret_id = "DATABASE_URL"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_url_v1" {
  secret      = google_secret_manager_secret.db_url.id
  secret_data = "postgresql://instaflow:${var.db_password}@${google_sql_database_instance.postgres.private_ip_address}/instaflow"
}

# JWT Secret
resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "JWT_SECRET"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "jwt_secret_v1" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = var.jwt_secret
}

# Instagram Client ID
resource "google_secret_manager_secret" "ig_client_id" {
  secret_id = "IG_CLIENT_ID"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "ig_client_id_v1" {
  secret      = google_secret_manager_secret.ig_client_id.id
  secret_data = var.ig_client_id
}

# Instagram Client Secret
resource "google_secret_manager_secret" "ig_client_secret" {
  secret_id = "IG_CLIENT_SECRET"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "ig_client_secret_v1" {
  secret      = google_secret_manager_secret.ig_client_secret.id
  secret_data = var.ig_client_secret
}
# JWT Refresh Secret
resource "google_secret_manager_secret" "jwt_refresh_secret" {
  secret_id = "JWT_REFRESH_SECRET"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "jwt_refresh_secret_v1" {
  secret      = google_secret_manager_secret.jwt_refresh_secret.id
  secret_data = var.jwt_refresh_secret
}

# Dodo API Key
resource "google_secret_manager_secret" "dodo_api_key" {
  secret_id = "DODO_API_KEY"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "dodo_api_key_v1" {
  secret      = google_secret_manager_secret.dodo_api_key.id
  secret_data = var.dodo_api_key
}

# Cashfree App ID
resource "google_secret_manager_secret" "cashfree_app_id" {
  secret_id = "CASHFREE_APP_ID"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "cashfree_app_id_v1" {
  secret      = google_secret_manager_secret.cashfree_app_id.id
  secret_data = var.cashfree_app_id
}

# Cashfree Secret Key
resource "google_secret_manager_secret" "cashfree_secret_key" {
  secret_id = "CASHFREE_SECRET_KEY"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "cashfree_secret_key_v1" {
  secret      = google_secret_manager_secret.cashfree_secret_key.id
  secret_data = var.cashfree_secret_key
}

# Instagram Webhook Verify Token
resource "google_secret_manager_secret" "ig_webhook_verify_token" {
  secret_id = "IG_WEBHOOK_VERIFY_TOKEN"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "ig_webhook_verify_token_v1" {
  secret      = google_secret_manager_secret.ig_webhook_verify_token.id
  secret_data = var.ig_webhook_verify_token
}

# Master Encryption Key for token encryption
resource "google_secret_manager_secret" "master_encryption_key" {
  secret_id = "MASTER_ENCRYPTION_KEY"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "master_encryption_key_v1" {
  secret      = google_secret_manager_secret.master_encryption_key.id
  secret_data = var.master_encryption_key
}

# SMTP User Secret
resource "google_secret_manager_secret" "smtp_user" {
  secret_id = "SMTP_USER"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "smtp_user_v1" {
  secret      = google_secret_manager_secret.smtp_user.id
  secret_data = var.smtp_user != "" ? var.smtp_user : "undefined"
}

# SMTP Password Secret
resource "google_secret_manager_secret" "smtp_pass" {
  secret_id = "SMTP_PASS"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "smtp_pass_v1" {
  secret      = google_secret_manager_secret.smtp_pass.id
  secret_data = var.smtp_pass != "" ? var.smtp_pass : "undefined"
}

# Google OAuth Client ID
resource "google_secret_manager_secret" "google_client_id" {
  secret_id = "GOOGLE_CLIENT_ID"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "google_client_id_v1" {
  secret      = google_secret_manager_secret.google_client_id.id
  secret_data = var.google_client_id != "" ? var.google_client_id : "undefined"
}

# Google OAuth Client Secret
resource "google_secret_manager_secret" "google_client_secret" {
  secret_id = "GOOGLE_CLIENT_SECRET"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "google_client_secret_v1" {
  secret      = google_secret_manager_secret.google_client_secret.id
  secret_data = var.google_client_secret != "" ? var.google_client_secret : "undefined"
}
