/**
 * Application constants
 */

// API Configuration
export const API_CONFIG = {
    TIMEOUT_MS: 15000,
    RETRY_COUNT: 3,
    RETRY_DELAY_MS: 1000,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    IS_LOGGED_IN: 'isLoggedIn',
    IS_IG_CONNECTED: 'isIGConnected',
} as const;

// Toast Configuration
export const TOAST_CONFIG = {
    DEFAULT_DURATION_MS: 5000,
    SUCCESS_DURATION_MS: 3000,
    ERROR_DURATION_MS: 7000,
    MAX_TOASTS: 5,
} as const;

// Animation Durations
export const ANIMATION = {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
} as const;

// Form Validation
export const VALIDATION = {
    PASSWORD_MIN_LENGTH: 8,
    NAME_MIN_LENGTH: 2,
    OTP_LENGTH: 6,
} as const;

// Route Paths
export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    DASHBOARD: '/dashboard',
    AUTH_CALLBACK: '/auth-callback',
    SUBSCRIPTION_SUCCESS: '/subscription/success',
    SUBSCRIPTION_CANCEL: '/subscription/cancel',
} as const;
