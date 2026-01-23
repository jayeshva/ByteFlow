import axios, { type AxiosError, type AxiosInstance, type AxiosResponse } from 'axios';
import { z } from 'zod';
import { API_CONFIG, STORAGE_KEYS } from '../../lib/constants';
import { getStorageItem, setStorageItem, removeStorageItem, generateId, isBrowser } from '../../lib/utils';

/**
 * API Client Configuration
 * Production-ready Axios instance with interceptors, retry logic, and Zod validation
 */

const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/+$/, '');

const baseConfig = {
    baseURL: API_BASE_URL,
    timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS) || API_CONFIG.TIMEOUT_MS,
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
};

// Main API client
export const apiClient: AxiosInstance = axios.create(baseConfig);

// Separate client for token refresh (to avoid interceptor loops)
const refreshClient: AxiosInstance = axios.create(baseConfig);

/**
 * API Error Type
 */
export interface ApiError {
    message: string;
    status?: number;
    code?: string;
    details?: unknown;
    requestId?: string;
}

/**
 * Token Management
 */
const getAccessToken = () => getStorageItem(STORAGE_KEYS.ACCESS_TOKEN);
const getRefreshToken = () => getStorageItem(STORAGE_KEYS.REFRESH_TOKEN);

export const setAuthTokens = (accessToken?: string, refreshToken?: string) => {
    if (accessToken) setStorageItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
};

export const clearAuthTokens = () => {
    removeStorageItem(STORAGE_KEYS.ACCESS_TOKEN);
    removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
    removeStorageItem(STORAGE_KEYS.IS_LOGGED_IN);
    removeStorageItem(STORAGE_KEYS.IS_IG_CONNECTED);
};

/**
 * Generate unique request ID for tracing
 */
const createRequestId = (): string => generateId();

/**
 * Normalize any error into a consistent ApiError format
 */
export const normalizeApiError = (error: unknown): ApiError => {
    if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as Record<string, unknown> | undefined;
        const message =
            (typeof responseData?.message === 'string' && responseData.message) ||
            (typeof responseData?.error === 'string' && responseData.error) ||
            error.message ||
            'Request failed';
        const code = (typeof responseData?.code === 'string' && responseData.code) || error.code;
        const requestId = error.response?.headers?.['x-request-id'];

        return {
            message,
            status: error.response?.status,
            code,
            details: responseData,
            requestId,
        };
    }

    if (error instanceof Error) {
        return { message: error.message };
    }

    // Handle already-normalized ApiError objects (from interceptor)
    if (typeof error === 'object' && error !== null && 'message' in error) {
        return error as ApiError;
    }

    return { message: 'An unexpected error occurred' };
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error: unknown, fallback = 'Request failed. Please try again.'): string => {
    const apiError = normalizeApiError(error);

    // Map common error codes to user-friendly messages
    if (apiError.status === 401) {
        // Use actual message if available (e.g., "Invalid email or password")
        // Only use generic message if no specific message from backend
        return apiError.message || 'Your session has expired. Please log in again.';
    }
    if (apiError.status === 403) {
        return 'You do not have permission to perform this action.';
    }
    if (apiError.status === 404) {
        return 'The requested resource was not found.';
    }
    if (apiError.status === 429) {
        return 'Too many requests. Please wait a moment and try again.';
    }
    if (apiError.status && apiError.status >= 500) {
        return 'Server error. Please try again later.';
    }
    if (apiError.code === 'ECONNABORTED') {
        return 'Request timed out. Please check your connection.';
    }
    if (apiError.code === 'ERR_NETWORK') {
        return 'Network error. Please check your internet connection.';
    }

    return apiError.message || fallback;
};

/**
 * Get API base URL
 */
export const getApiBaseUrl = () => API_BASE_URL;

/**
 * Token Refresh Logic
 */
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
        console.log('[Auth] No refresh token available');
        return null;
    }

    // Deduplicate concurrent refresh requests
    if (!refreshPromise) {
        refreshPromise = refreshClient
            .post(
                '/auth/refresh',
                { refreshToken },
                { headers: { 'X-Request-Id': createRequestId() } }
            )
            .then((response) => {
                const accessToken = response.data?.accessToken as string | undefined;
                if (accessToken) {
                    setAuthTokens(accessToken);
                    console.log('[Auth] Token refreshed successfully');
                }
                return accessToken ?? null;
            })
            .catch((error) => {
                console.error('[Auth] Token refresh failed:', error?.response?.data || error?.message);
                return null;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
};

/**
 * Request Interceptor
 * - Adds authorization header
 * - Adds request ID for tracing
 */
apiClient.interceptors.request.use((config) => {
    const requestId = createRequestId();
    if (config.headers) {
        config.headers['X-Request-Id'] = requestId;
    }

    const token = getAccessToken();
    if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

/**
 * Response Interceptor
 * - Handles 401 errors with token refresh
 * - Normalizes errors for consistent handling
 */
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

        // Handle 401 with token refresh
        // Exclude authentication requests themselves from this logic
        const isAuthRequest = originalRequest?.url?.includes('/auth/');

        if (
            error.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !isAuthRequest
        ) {
            originalRequest._retry = true;
            console.log('[Auth] 401 detected, attempting token refresh...');

            const newAccessToken = await refreshAccessToken();

            if (newAccessToken) {
                console.log('[Auth] Retrying original request with new token');
                if (originalRequest.headers) {
                    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                }
                return apiClient(originalRequest);
            }

            // Refresh failed - clear tokens and redirect to login
            console.log('[Auth] Token refresh failed, redirecting to login');
            clearAuthTokens();
            if (isBrowser()) {
                window.location.href = '/login';
            }
            return Promise.reject(normalizeApiError(error));
        }

        return Promise.reject(normalizeApiError(error));
    }
);

/**
 * Validated API Request Helper
 * Makes API request and validates response with Zod schema
 */
export async function validatedRequest<T>(
    request: Promise<AxiosResponse>,
    schema: z.ZodType<T>
): Promise<T> {
    const response = await request;
    const parsed = schema.safeParse(response.data);

    if (!parsed.success) {
        console.error('[API] Response validation failed:', parsed.error.issues);
        throw new Error('Invalid response format from server');
    }

    return parsed.data;
}

/**
 * Logout Helper
 */
export const logout = () => {
    console.log('[Auth] Logging out user');
    if (isBrowser()) {
        localStorage.clear();
    }
    clearAuthTokens();
    if (isBrowser()) {
        window.location.href = '/login';
    }
};

export type RootApiError = ReturnType<typeof normalizeApiError>;
