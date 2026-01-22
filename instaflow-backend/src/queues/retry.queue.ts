import { Queue } from 'bullmq';
import { config } from '../config';

/**
 * retryQueue
 * 
 * Specifically for handling messages that hit rate limits or 
 * overflow from Cloud Pub/Sub. Jobs here are usually scheduled 
 * with a delay.
 */
export const retryQueue = new Queue('retry_events', {
    connection: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
    },
    defaultJobOptions: {
        attempts: 10,
        backoff: {
            type: 'exponential',
            delay: 60000, // Start with 1 minute backoff for general failures
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});
