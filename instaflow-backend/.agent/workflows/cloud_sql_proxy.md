---
description: Start Cloud SQL Auth Proxy and run Prisma migrations
---

# Connect to Cloud SQL via Proxy

1. **Start the Proxy:**
   Run this command in a separate terminal window to create a local tunnel to your Cloud SQL instance.
   ```bash
   # Make sure you have the cloud_sql_proxy executable or install it
   # curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.0/cloud-sql-proxy.darwin.amd64
   # chmod +x cloud-sql-proxy

   ./cloud-sql-proxy project-663d250c-5cb4-409d-a94:asia-south1:instaflow-db-instance
   ```
   *Note: Replace `project-663d250c-5cb4-409d-a94:asia-south1:instaflow-db-instance` with your actual Connection Name if different.*

2. **Run Migration:**
   In your main terminal (while the proxy is running), execute the migration using the proxy's local port (default 5432 or specify if mapping elsewhere).
   ```bash
   # Temporarily set DATABASE_URL to point to the local proxy
   DATABASE_URL="postgresql://instaflow:YOUR_DB_PASSWORD@127.0.0.1:5432/instaflow" npx prisma migrate deploy
   ```
   *Note: Use `migrate deploy` for production/staging to apply pending migrations without resetting the database.*
