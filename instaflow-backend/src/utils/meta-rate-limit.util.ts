/**
 * Meta Graph API Rate Limit Utility
 * 
 * Handles parsing of X-Business-Use-Case-Usage headers and implements
 * rate limit tracking and exponential backoff for Meta API calls.
 * 
 * Reference: https://developers.facebook.com/docs/graph-api/overview/rate-limiting/
 */

import logger from './logger';

// Rate limit error codes from Meta
export const META_RATE_LIMIT_CODES = {
    INSTAGRAM_PLATFORM: 80002,
    MESSENGER: 80006,
    PAGES_USER_TOKEN: 32,
    PAGES_PAGE_TOKEN: 80001,
};

export interface MetaRateLimitInfo {
    type: 'ads_insights' | 'ads_management' | 'custom_audience' | 'instagram' | 'leadgen' | 'messenger' | 'pages';
    callCount: number;
    totalCpuTime: number;
    totalTime: number;
    estimatedTimeToRegainAccess: number;
}

export interface ParsedRateLimitHeader {
    [businessObjectId: string]: MetaRateLimitInfo[];
}

/**
 * Parse the X-Business-Use-Case-Usage header from Meta API responses
 */
export function parseRateLimitHeader(headerValue: string | undefined): ParsedRateLimitHeader | null {
    if (!headerValue) return null;

    try {
        const parsed = JSON.parse(headerValue);
        return parsed as ParsedRateLimitHeader;
    } catch (error) {
        logger.warn({ headerValue }, 'Failed to parse X-Business-Use-Case-Usage header');
        return null;
    }
}

/**
 * Check if response headers indicate we're approaching rate limit
 * Returns true if any metric is above the threshold (default 80%)
 */
export function isApproachingRateLimit(
    rateLimitInfo: MetaRateLimitInfo[],
    threshold: number = 80
): boolean {
    return rateLimitInfo.some(info =>
        info.callCount >= threshold ||
        info.totalCpuTime >= threshold ||
        info.totalTime >= threshold
    );
}

/**
 * Check if an error response indicates rate limiting
 */
export function isRateLimitError(error: any): boolean {
    const code = error?.response?.data?.error?.code;
    return Object.values(META_RATE_LIMIT_CODES).includes(code);
}

/**
 * Extract estimated time to regain access from error or headers
 */
export function getWaitTime(error: any, defaultMinutes: number = 5): number {
    // Try to get from error response
    const errorData = error?.response?.data?.error;
    if (errorData?.error_data?.blame_field_specs) {
        // Some errors include specific wait time info
    }

    // Try to get from headers
    const headers = error?.response?.headers;
    const rateLimitHeader = headers?.['x-business-use-case-usage'];
    const rateLimitInfo = parseRateLimitHeader(rateLimitHeader);

    if (rateLimitInfo) {
        // Find the highest estimated_time_to_regain_access across all business objects
        let maxWaitTime = 0;
        for (const businessId in rateLimitInfo) {
            for (const info of rateLimitInfo[businessId]) {
                if (info.estimatedTimeToRegainAccess > maxWaitTime) {
                    maxWaitTime = info.estimatedTimeToRegainAccess;
                }
            }
        }
        if (maxWaitTime > 0) {
            return maxWaitTime * 60 * 1000; // Convert minutes to ms
        }
    }

    // Default wait time
    return defaultMinutes * 60 * 1000;
}

/**
 * Calculate exponential backoff delay
 * @param attempt Current attempt number (1-based)
 * @param baseDelayMs Base delay in milliseconds
 * @param maxDelayMs Maximum delay cap
 */
export function calculateBackoff(
    attempt: number,
    baseDelayMs: number = 1000,
    maxDelayMs: number = 60000
): number {
    // Exponential backoff with jitter: base * 2^attempt + random jitter
    const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // 0-1 second jitter
    return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Sleep utility for async/await
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff for Meta API calls
 * Handles rate limiting errors automatically
 */
export async function withMetaRateLimitRetry<T>(
    operation: () => Promise<T>,
    options: {
        maxRetries?: number;
        onRateLimited?: (waitMs: number) => void;
        operationName?: string;
    } = {}
): Promise<T> {
    const { maxRetries = 3, onRateLimited, operationName = 'Meta API call' } = options;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;

            if (isRateLimitError(error)) {
                const waitTime = getWaitTime(error);

                logger.warn({
                    operationName,
                    attempt,
                    maxRetries,
                    waitTimeMs: waitTime,
                    errorCode: error?.response?.data?.error?.code,
                }, `Rate limited on ${operationName}, waiting before retry`);

                if (onRateLimited) {
                    onRateLimited(waitTime);
                }

                if (attempt < maxRetries) {
                    await sleep(waitTime);
                    continue;
                }
            } else if (attempt < maxRetries) {
                // For non-rate-limit errors, use exponential backoff
                const backoffTime = calculateBackoff(attempt);
                logger.warn({
                    operationName,
                    attempt,
                    maxRetries,
                    backoffMs: backoffTime,
                    error: error.message,
                }, `Retrying ${operationName} after error`);
                await sleep(backoffTime);
                continue;
            }

            // Re-throw on final attempt
            throw error;
        }
    }

    throw lastError;
}

/**
 * Redis-based rate limit tracker for DM sending
 * Tracks calls per hour to stay under 750 private replies/hour limit
 * Works across multiple Cloud Run instances
 */
import Redis from 'ioredis';
import { config } from '../config';

// Redis client for rate limiting
const redisClient = new Redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
});

redisClient.on('error', (err) => {
    logger.error({ err }, 'Redis rate limiter connection error');
});

const RATE_LIMIT_KEY_PREFIX = 'rate_limit:dm:';
const MAX_CALLS_PER_HOUR = 700; // Buffer under Meta's 750 limit
const WINDOW_MS = 3600 * 1000; // 1 hour in milliseconds

/**
 * Redis-based Sliding Window Rate Limiter
 * 
 * Uses Redis Sorted Sets (ZSET) to implement a true sliding window.
 * Each API call is stored with timestamp as score, allowing accurate
 * counting of calls within the last hour at any point in time.
 * 
 * Key structure: rate_limit:dm:{accountId}
 * Members: unique call IDs (timestamp + random)
 * Scores: Unix timestamp in milliseconds
 */
export class RedisRateLimiter {
    /**
     * Check if account can make another call using sliding window
     */
    async canMakeCall(accountId: string): Promise<boolean> {
        try {
            const key = `${RATE_LIMIT_KEY_PREFIX}${accountId}`;
            const now = Date.now();
            const windowStart = now - WINDOW_MS;

            // Remove expired entries and count remaining in one transaction
            await redisClient.zremrangebyscore(key, 0, windowStart);
            const count = await redisClient.zcard(key);

            return count < MAX_CALLS_PER_HOUR;
        } catch (error) {
            logger.error({ error, accountId }, 'Redis canMakeCall error, allowing call');
            return true; // Fail open to not block business
        }
    }

    /**
     * Get time until next call is allowed (in ms)
     * Returns time until the oldest entry in the window expires
     */
    async getWaitTime(accountId: string): Promise<number> {
        try {
            const key = `${RATE_LIMIT_KEY_PREFIX}${accountId}`;
            const now = Date.now();
            const windowStart = now - WINDOW_MS;

            // Clean up expired entries first
            await redisClient.zremrangebyscore(key, 0, windowStart);

            const count = await redisClient.zcard(key);

            if (count < MAX_CALLS_PER_HOUR) {
                return 0; // Not rate limited
            }

            // Get the oldest entry's timestamp
            const oldest = await redisClient.zrange(key, 0, 0, 'WITHSCORES');

            if (oldest && oldest.length >= 2) {
                const oldestTimestamp = parseInt(oldest[1], 10);
                const expiresAt = oldestTimestamp + WINDOW_MS;
                const waitTime = expiresAt - now;
                return Math.max(0, waitTime);
            }

            // Fallback: wait 1 minute if we can't determine
            return 60 * 1000;
        } catch (error) {
            logger.error({ error, accountId }, 'Redis getWaitTime error');
            return 60 * 1000; // 1 minute fallback
        }
    }

    /**
     * Atomically check and reserve a slot if available.
     * Prevents race conditions where multiple workers see the same slot.
     */
    async reserveCall(accountId: string): Promise<boolean> {
        try {
            const key = `${RATE_LIMIT_KEY_PREFIX}${accountId}`;
            const now = Date.now();
            const windowStart = now - WINDOW_MS;
            const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;
            const expireSeconds = Math.ceil(WINDOW_MS / 1000) + 60;

            const script = `
                local key = KEYS[1]
                local windowStart = ARGV[1]
                local limit = tonumber(ARGV[2])
                local now = ARGV[3]
                local member = ARGV[4]
                local expire = ARGV[5]

                -- Clean up expired entries
                redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
                
                -- Check count
                local count = redis.call('ZCARD', key)

                if count < limit then
                    -- Reserve slot
                    redis.call('ZADD', key, now, member)
                    redis.call('EXPIRE', key, expire)
                    return 1 -- Success
                else
                    return 0 -- Limit reached
                end
            `;

            const result = await redisClient.eval(
                script,
                1,
                key,
                windowStart,
                MAX_CALLS_PER_HOUR,
                now,
                member,
                expireSeconds
            );

            return result === 1;
        } catch (error) {
            logger.error({ error, accountId }, 'Redis reserveCall error, allowing call (fail open)');
            // Fallback: rely on downstream checks or fail open if critical
            return true;
        }
    }

    /**
     * Record a call for an account using sliding window
     */
    async recordCall(accountId: string): Promise<void> {
        try {
            const key = `${RATE_LIMIT_KEY_PREFIX}${accountId}`;
            const now = Date.now();
            const windowStart = now - WINDOW_MS;

            // Use pipeline for atomic operations
            const pipeline = redisClient.pipeline();

            // Remove expired entries
            pipeline.zremrangebyscore(key, 0, windowStart);

            // Add new entry with unique member (timestamp + random to avoid collisions)
            const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;
            pipeline.zadd(key, now, member);

            // Set key expiration to auto-cleanup (slightly longer than window)
            pipeline.expire(key, Math.ceil(WINDOW_MS / 1000) + 60);

            await pipeline.exec();

            // Log for debugging
            const count = await redisClient.zcard(key);
            logger.debug({ accountId, count, limit: MAX_CALLS_PER_HOUR }, 'Rate limit call recorded (sliding window)');
        } catch (error) {
            logger.error({ error, accountId }, 'Redis recordCall error');
        }
    }

    /**
     * Get current usage for an account (sliding window)
     */
    async getUsage(accountId: string): Promise<{ count: number; limit: number; resetIn: number }> {
        try {
            const key = `${RATE_LIMIT_KEY_PREFIX}${accountId}`;
            const now = Date.now();
            const windowStart = now - WINDOW_MS;

            // Clean up and count
            await redisClient.zremrangebyscore(key, 0, windowStart);
            const count = await redisClient.zcard(key);

            // Get time until oldest entry expires
            let resetIn = 0;
            if (count >= MAX_CALLS_PER_HOUR) {
                const oldest = await redisClient.zrange(key, 0, 0, 'WITHSCORES');
                if (oldest && oldest.length >= 2) {
                    const oldestTimestamp = parseInt(oldest[1], 10);
                    resetIn = Math.max(0, (oldestTimestamp + WINDOW_MS) - now);
                }
            }

            return {
                count,
                limit: MAX_CALLS_PER_HOUR,
                resetIn,
            };
        } catch (error) {
            logger.error({ error, accountId }, 'Redis getUsage error');
            return { count: 0, limit: MAX_CALLS_PER_HOUR, resetIn: 0 };
        }
    }

    /**
     * Get all accounts' rate limit usage (for monitoring dashboard)
     */
    async getAllUsage(): Promise<Record<string, { count: number; resetIn: number }>> {
        try {
            const keys = await redisClient.keys(`${RATE_LIMIT_KEY_PREFIX}*`);
            const result: Record<string, { count: number; resetIn: number }> = {};
            const now = Date.now();
            const windowStart = now - WINDOW_MS;

            for (const key of keys) {
                const accountId = key.replace(RATE_LIMIT_KEY_PREFIX, '');

                // Clean up and count
                await redisClient.zremrangebyscore(key, 0, windowStart);
                const count = await redisClient.zcard(key);

                // Get reset time
                let resetIn = 0;
                if (count > 0) {
                    const oldest = await redisClient.zrange(key, 0, 0, 'WITHSCORES');
                    if (oldest && oldest.length >= 2) {
                        const oldestTimestamp = parseInt(oldest[1], 10);
                        resetIn = Math.max(0, (oldestTimestamp + WINDOW_MS) - now);
                    }
                }

                result[accountId] = { count, resetIn };
            }

            return result;
        } catch (error) {
            logger.error({ error }, 'Redis getAllUsage error');
            return {};
        }
    }
}

// Singleton instance for DM rate limiting
export const dmRateLimiter = new RedisRateLimiter();
