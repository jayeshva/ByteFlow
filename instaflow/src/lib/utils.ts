/**
 * Utility functions for the application
 */

/**
 * Delays execution for the specified duration
 */
export const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates a unique ID
 */
export const generateId = (): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Formats a date to a readable string
 */
export const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

/**
 * Formats a number with K/M suffix for large numbers
 */
export const formatNumber = (num: number): string => {
    if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
        return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
};

/**
 * Truncates text to the specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3)}...`;
};

/**
 * Capitalizes the first letter of a string
 */
export const capitalize = (str: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Debounce function for rate limiting
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
    fn: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

/**
 * Safely parse JSON with fallback
 */
export const safeJsonParse = <T>(
    json: string,
    fallback: T
): T => {
    try {
        return JSON.parse(json) as T;
    } catch {
        return fallback;
    }
};

/**
 * Check if running in browser environment
 */
export const isBrowser = (): boolean => typeof window !== 'undefined';

/**
 * Get storage item safely
 */
export const getStorageItem = (key: string): string | null => {
    if (!isBrowser()) return null;
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

/**
 * Set storage item safely
 */
export const setStorageItem = (key: string, value: string): void => {
    if (!isBrowser()) return;
    try {
        localStorage.setItem(key, value);
    } catch {
        // Storage not available
    }
};

/**
 * Remove storage item safely
 */
export const removeStorageItem = (key: string): void => {
    if (!isBrowser()) return;
    try {
        localStorage.removeItem(key);
    } catch {
        // Storage not available
    }
};
