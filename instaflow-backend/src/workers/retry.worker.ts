import { Worker, DelayedError } from "bullmq";
import { config } from "../config";
import { processEvent } from "./unified.worker";
import { isRateLimitError } from "../utils/meta-rate-limit.util";
import logger from "../utils/logger";

/**
 * retryWorker
 * 
 * Processes jobs from 'retry_events'.
 * Handles rate-limited overflow from both BullMQ and Pub/Sub workers.
 * 
 * Uses the shared processEvent() function to ensure all features
 * (deduplication, rate limiting, automation matching) are consistent.
 */
const retryWorker = new Worker(
    "retry_events",
    async job => {
        try {
            const event = job.data;
            console.log(`🔄 Processing retried job ${job.id}`);

            // Use the shared processEvent function for consistency
            const result = await processEvent(event);

            if (!result.success && result.shouldDelay) {
                // Move job to delayed state
                console.log(`⏳ Still rate limited. Delaying retry for ${Math.ceil(result.shouldDelay / 60000)}m`);
                await job.moveToDelayed(Date.now() + result.shouldDelay);
                throw new DelayedError();
            }
        } catch (error: any) {
            if (error.name === 'DelayedError') throw error;

            // Only retry if it's a rate limit error
            if (isRateLimitError(error)) {
                console.warn('⚠️ Rate limit error in retry worker, retrying:', error.message);
                throw error; // BullMQ will handle retry attempts
            }

            console.error('❌ Event processing failed in retry worker (dropping):', error);
            // Don't throw - this marks job as completed/failed without retry
        }
    },
    {
        connection: { host: config.REDIS_HOST, port: config.REDIS_PORT },
        concurrency: 5,
        lockDuration: 60000 // Increase lock duration to 60s to avoid lock mismatch errors
    }
);

retryWorker.on("completed", job => {
    console.log(`✅ Retry job ${job.id} completed`);
});

retryWorker.on("failed", (job, err) => {
    if (err.name !== 'DelayedError') {
        console.error(`❌ Retry job ${job?.id} failed:`, err.message);
    }
});

export default retryWorker;
