import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.string().transform(Number).default(4000 as any),
    DATABASE_URL: z.string().url(),
    INSTANCE_CONNECTION_NAME: z.string().optional(),
    DB_USER: z.string().optional(),
    DB_NAME: z.string().optional(),
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),

    // SMTP Configuration
    SMTP_HOST: z.string(),
    SMTP_PORT: z.string().transform(Number),
    SMTP_USER: z.string(),
    SMTP_PASS: z.string(),
    SMTP_FROM: z.string().default('no-reply@jaydesk.com'),

    // Google OAuth
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),

    // Payment Providers
    DODO_API_KEY: z.string().optional(),
    CASHFREE_APP_ID: z.string().optional(),
    CASHFREE_SECRET_KEY: z.string().optional(),

    FRONTEND_URL: z.string().url().default('http://localhost:3000'),

    CLIENT_ID: z.string().optional(),
    CLIENT_SECRET: z.string().optional(),
    IG_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
    IG_REDIRECT_URI: z.string().url().optional(),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.string().transform(Number).default(6379 as any),
    REDIS_URL: z.string().url().optional(),
    RUN_MODE: z.enum(['local', 'worker', 'api', 'cloud']).default('local'),
    GCP_PROJECT_ID: z.string().optional(),
    PUBSUB_TOPIC: z.string().default('instagram-webhooks'),
    PUBSUB_SUBSCRIPTION: z.string().default('instagram-webhooks-sub'),
    MASTER_ENCRYPTION_KEY: z.string().min(32).default('super-secret-master-key-change-me-in-prod'),
});

const envFound = envSchema.safeParse(process.env);

if (!envFound.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(envFound.error.format(), null, 2));
    process.exit(1);
}

export const config = envFound.data;
