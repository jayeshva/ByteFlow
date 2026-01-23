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
 * Lua script for atomic slot acquisition
 * 
 * This ensures that multiple workers don't race for the same slot.
 * It atomically:
 * 1. Gets the current "next allowed" timestamp
 * 2. Calculates the new "next allowed" timestamp
 * 3. Sets the new value
 * 4. Returns the wait time (0 if no wait needed)
 */
const ACQUIRE_SLOT_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local interval = tonumber(ARGV[2])

-- Get current next allowed time (or 0 if not set)
local nextAllowed = tonumber(redis.call('GET', key) or '0')

-- Calculate when this caller should execute
local executeAt = math.max(now, nextAllowed)
local waitTime = executeAt - now

-- Book the next slot for the next caller
local newNextAllowed = executeAt + interval
redis.call('SET', key, newNextAllowed, 'PX', interval * 3)

return waitTime
`;

/**
 * OutflowSmoothingController
 * 
 * Implements a "Leaky Bucket" controller using atomic Redis operations
 * to ensure DMs are sent at a steady pace (e.g., 1 every 5 seconds per account).
 * 
 * This prevents bursts that look like spam and mimics human behavior.
 */
export class OutflowSmoothingController {
    private static KEY_PREFIX = 'outflow_control:';
    private static scriptSha: string | null = null;

    /**
     * Load the Lua script into Redis (called once)
     */
    private static async ensureScriptLoaded(): Promise<string> {
        if (this.scriptSha) {
            return this.scriptSha;
        }
        try {
            this.scriptSha = await redisClient.script('LOAD', ACQUIRE_SLOT_SCRIPT) as string;
            return this.scriptSha;
        } catch (error) {
            logger.error({ error }, 'Failed to load Lua script');
            throw error;
        }
    }

    /**
     * Acquire a slot for sending a DM (atomic operation).
     * Returns the wait time in milliseconds before the caller should proceed.
     * 
     * @param accountId IG Account ID
     * @param intervalMs Desired interval between DMs (default 5 seconds)
     * @returns Wait time in ms (0 = proceed immediately)
     */
    static async acquireSlot(accountId: string, intervalMs: number = 5000): Promise<number> {
        const key = `${this.KEY_PREFIX}${accountId}`;
        const now = Date.now();

        try {
            const sha = await this.ensureScriptLoaded();
            const waitTime = await redisClient.evalsha(
                sha,
                1,
                key,
                now.toString(),
                intervalMs.toString()
            ) as number;

            if (waitTime > 0) {
                logger.debug({ accountId, waitTimeMs: waitTime }, 'Outflow smoothing: slot acquired with wait');
            }

            return waitTime;
        } catch (error: any) {
            // If script was flushed, reload it
            if (error.message?.includes('NOSCRIPT')) {
                this.scriptSha = null;
                return this.acquireSlot(accountId, intervalMs);
            }
            logger.error({ error, accountId }, 'Error in OutflowSmoothingController');
            return 0; // Fail open
        }
    }

    /**
     * Wait for a slot and then return (blocks until slot is acquired).
     * Use this for simpler inline waiting without job delays.
     * 
     * @param accountId IG Account ID
     * @param intervalMs Desired interval between DMs (default 5 seconds)
     */
    static async waitAndAcquire(accountId: string, intervalMs: number = 5000): Promise<void> {
        const waitTime = await this.acquireSlot(accountId, intervalMs);

        if (waitTime > 0) {
            logger.debug({ accountId, waitTimeMs: waitTime }, 'Outflow smoothing: waiting for slot');
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    /**
     * Get the current queue status for an account
     */
    static async getStatus(accountId: string): Promise<{ nextAvailableIn: number }> {
        const key = `${this.KEY_PREFIX}${accountId}`;
        const now = Date.now();

        try {
            const nextAllowedStr = await redisClient.get(key);
            const nextAllowed = nextAllowedStr ? parseInt(nextAllowedStr, 10) : now;

            return {
                nextAvailableIn: Math.max(0, nextAllowed - now)
            };
        } catch (error) {
            logger.error({ error, accountId }, 'Error getting outflow status');
            return { nextAvailableIn: 0 };
        }
    }
}
