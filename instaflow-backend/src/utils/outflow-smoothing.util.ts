import Redis from 'ioredis';
import { config } from '../config';
import logger from './logger';

const redisClient = new Redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
});

/**
 * OutflowSmoothingController
 * 
 * Implements a "Leaky Bucket" or "Steady Rate" controller to prevent 
 * bursts of DMs. This ensures DMs are sent at a professional, 
 * steady pace (e.g., 1 every 3-5 seconds per account).
 */
export class OutflowSmoothingController {
    private static KEY_PREFIX = 'outflow_control:';

    /**
     * Acquire a slot for sending a DM.
     * If a slot is not immediately available, returns the wait time in MS.
     * 
     * @param accountId IG Account ID
     * @param intervalMs Desired interval between DMs (default 5 seconds)
     */
    static async acquireSlot(accountId: string, intervalMs: number = 5000): Promise<number> {
        const key = `${this.KEY_PREFIX}${accountId}`;
        const now = Date.now();

        try {
            // Get the timestamp of the last allowed call
            const lastCallStr = await redisClient.get(key);
            const lastCall = lastCallStr ? parseInt(lastCallStr, 10) : 0;

            // Calculate when the next call can happen
            const nextAllowedCall = lastCall + intervalMs;

            if (now >= nextAllowedCall) {
                // Can call now. Update the timestamp to 'now'
                await redisClient.set(key, now.toString(), 'PX', intervalMs * 2);
                return 0;
            } else {
                // Must wait. Update the timestamp to 'nextAllowedCall' 
                // effectively "booking" the next slot in the future
                await redisClient.set(key, nextAllowedCall.toString(), 'PX', (nextAllowedCall - now) + intervalMs * 2);
                return nextAllowedCall - now;
            }
        } catch (error) {
            logger.error({ error, accountId }, 'Error in OutflowSmoothingController');
            return 0; // Fail open
        }
    }
}
