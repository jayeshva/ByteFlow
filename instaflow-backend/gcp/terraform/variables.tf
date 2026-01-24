variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "project-663d250c-5cb4-409d-a94"
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "asia-south1"
}

variable "db_password" {
  description = "Password for the database user"
  type        = string
  sensitive   = true
  default     = "mypassword"
}

variable "jwt_secret" {
  description = "JWT Secret for authentication"
  type        = string
  sensitive   = true
  default     = "your_super_secure_jwt_secret_key_that_is_long_enough"
}

variable "ig_client_id" {
  description = "Instagram Client ID"
  type        = string
  default     = "2367498500355473"
}

variable "ig_client_secret" {
  description = "Instagram Client Secret"
  type        = string
  sensitive   = true
  default     = "4dff37a6ef32eb5a7ff973c92dd0eeb7"
}

variable "ig_webhook_verify_token" {
  description = "Instagram Webhook Verify Token"
  type        = string
  default     = "INSTAFLOW_VERIFY_TOKEN_123"
}

variable "jwt_refresh_secret" {
  description = "JWT Refresh Secret"
  type        = string
  sensitive   = true
  default     = "your_super_secure_jwt_refresh_secret_key_that_is_long_enough"
}

variable "dodo_api_key" {
  description = "Dodo Payments API Key"
  type        = string
  sensitive   = true
  default     = "tTEefqE8PbOKM2aK.zI34QbSIMsHrFm59X2Big-NmPJf1Bt1T3_S76BFcsHX-eGZD"
}

variable "cashfree_app_id" {
  description = "Cashfree App ID"
  type        = string
  default     = "TEST10963227426ac19a35c9608b424072236901"
}

variable "cashfree_secret_key" {
  description = "Cashfree Secret Key"
  type        = string
  sensitive   = true
  default     = "cfsk_ma_test_4c710556f3f9775062e8f30c3bc7d5e2_4d5dc239"
}

variable "frontend_url" {
  description = "Frontend Application URL"
  type        = string
  default     = "https://instaflow.jaydesk.com/"
}

variable "master_encryption_key" {
  description = "Master encryption key for token encryption (min 32 chars)"
  type        = string
  sensitive   = true
  default     = "super-secret-master-key-change-me-in-prod"
}

# SMTP Configuration
variable "smtp_host" {
  description = "SMTP server host"
  type        = string
  default     = "smtp.gmail.com"
}

variable "smtp_port" {
  description = "SMTP server port"
  type        = number
  default     = 587
}

variable "smtp_user" {
  description = "SMTP username/email"
  type        = string
  sensitive   = true
  default     = ""
}

variable "smtp_pass" {
  description = "SMTP password or app password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "smtp_from" {
  description = "SMTP from email address"
  type        = string
  default     = "noreply@instaflow.me"
}

# Google OAuth
variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
  default     = ""
}
