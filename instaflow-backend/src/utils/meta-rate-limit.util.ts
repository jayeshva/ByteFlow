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
const WINDOW_SECONDS = 3600; // 1 hour

export class RedisRateLimiter {
    /**
     * Check if account can make another call (async)
     */
    async canMakeCall(accountId: string): Promise<boolean> {
        try {
            const key = `${RATE_LIMIT_KEY_PREFIX}${accountId}`;
            const count = await redisClient.get(key);

            if (!count) return true;
            return parseInt(count, 10) < MAX_CALLS_PER_HOUR;
        } catch (error) {
            logger.error({ error, accountId }, 'Redis canMakeCall error, allowing call');
            return true; // Fail open to not block business
        }
    }

    /**
     * Get time until next call is allowed (in ms)
     */
    async getWaitTime(accountId: string): Promise<number> {
        try {
            const key = `${RATE_LIMIT_KEY_PREFIX}${accountId}`;
            const [count, ttl] = await Promise.all([
                redisClient.get(key),
                redisClient.ttl(key)
            ]);

            if (!count || parseInt(count, 10) < MAX_CALLS_PER_HOUR) {
                return 0;
            }

            return ttl > 0 ? ttl * 1000 : 0;
        } catch (error) {
            logger.error({ error, accountId }, 'Redis getWaitTime error');
            return 0;
        }
    }

    /**
     * Record a call for an account (atomic increment with TTL)
     */
    async recordCall(accountId: string): Promise<void> {
        try {
            const key = `${RATE_LIMIT_KEY_PREFIX}${accountId}`;

            // Atomic increment. If key doesn't exist, starts at 1
            const newCount = await redisClient.incr(key);

            // Set TTL only on first call (when count is 1)
            if (newCount === 1) {
                await redisClient.expire(key, WINDOW_SECONDS);
            }

            logger.debug({ accountId, count: newCount, limit: MAX_CALLS_PER_HOUR }, 'Rate limit call recorded');
        } catch (error) {
            logger.error({ error, accountId }, 'Redis recordCall error');
        }
    }

    /**
     * Get current usage for an account
     */
    async getUsage(accountId: string): Promise<{ count: number; limit: number; resetIn: number }> {
        try {
            const key = `${RATE_LIMIT_KEY_PREFIX}${accountId}`;
            const [count, ttl] = await Promise.all([
                redisClient.get(key),
                redisClient.ttl(key)
            ]);

            return {
                count: count ? parseInt(count, 10) : 0,
                limit: MAX_CALLS_PER_HOUR,
                resetIn: ttl > 0 ? ttl * 1000 : 0,
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

            for (const key of keys) {
                const accountId = key.replace(RATE_LIMIT_KEY_PREFIX, '');
                const [count, ttl] = await Promise.all([
                    redisClient.get(key),
                    redisClient.ttl(key)
                ]);
                result[accountId] = {
                    count: count ? parseInt(count, 10) : 0,
                    resetIn: ttl > 0 ? ttl * 1000 : 0,
                };
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
