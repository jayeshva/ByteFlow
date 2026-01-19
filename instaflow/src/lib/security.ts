/**
 * Security Utilities
 * Production-grade security helpers for input sanitization, XSS prevention, and validation
 */

/**
 * HTML Entity Encoding Map
 */
const HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
};

/**
 * Escape HTML entities to prevent XSS
 */
export const escapeHtml = (str: string): string => {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
};

/**
 * Sanitize user input - removes potentially dangerous content
 */
export const sanitizeInput = (input: string): string => {
    if (typeof input !== 'string') return '';

    return input
        // Remove null bytes
        .replace(/\0/g, '')
        // Remove script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove event handlers
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        // Remove javascript: URLs
        .replace(/javascript:/gi, '')
        // Remove data: URLs (except images)
        .replace(/data:(?!image\/(png|jpeg|gif|webp))[^;]+;/gi, '')
        // Trim whitespace
        .trim();
};

/**
 * Sanitize URL - ensures URL is safe to use
 */
export const sanitizeUrl = (url: string): string => {
    if (typeof url !== 'string') return '';

    const trimmed = url.trim();

    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerUrl = trimmed.toLowerCase();

    for (const protocol of dangerousProtocols) {
        if (lowerUrl.startsWith(protocol)) {
            return '';
        }
    }

    // Ensure URL starts with http/https or is relative
    if (
        !trimmed.startsWith('http://') &&
        !trimmed.startsWith('https://') &&
        !trimmed.startsWith('/') &&
        !trimmed.startsWith('#')
    ) {
        return `https://${trimmed}`;
    }

    return trimmed;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
    if (typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export interface PasswordStrength {
    score: number; // 0-4
    label: 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very Strong';
    suggestions: string[];
}

export const checkPasswordStrength = (password: string): PasswordStrength => {
    const suggestions: string[] = [];
    let score = 0;

    if (password.length >= 8) score++;
    else suggestions.push('Use at least 8 characters');

    if (password.length >= 12) score++;

    if (/[A-Z]/.test(password)) score++;
    else suggestions.push('Add uppercase letters');

    if (/[a-z]/.test(password)) score++;
    else suggestions.push('Add lowercase letters');

    if (/[0-9]/.test(password)) score++;
    else suggestions.push('Add numbers');

    if (/[^A-Za-z0-9]/.test(password)) score++;
    else suggestions.push('Add special characters');

    // Normalize to 0-4
    const normalizedScore = Math.min(4, Math.floor(score * 0.67));

    const labels: PasswordStrength['label'][] = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

    return {
        score: normalizedScore,
        label: labels[normalizedScore],
        suggestions,
    };
};

/**
 * Generate CSRF Token
 */
export const generateCsrfToken = (): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `csrf_${Date.now()}_${Math.random().toString(36).slice(2, 18)}`;
};

/**
 * Rate Limiter (client-side throttle)
 */
interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (key: string, config: RateLimitConfig): boolean => {
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
        rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
        return true;
    }

    if (record.count >= config.maxRequests) {
        return false;
    }

    record.count++;
    return true;
};

/**
 * Mask sensitive data for logging
 */
export const maskSensitiveData = (data: string, visibleChars = 4): string => {
    if (typeof data !== 'string' || data.length <= visibleChars * 2) {
        return '***';
    }
    return `${data.slice(0, visibleChars)}${'*'.repeat(data.length - visibleChars * 2)}${data.slice(-visibleChars)}`;
};

/**
 * Validate file upload
 */
interface FileValidation {
    maxSizeBytes: number;
    allowedTypes: string[];
}

export const validateFileUpload = (
    file: File,
    config: FileValidation
): { valid: boolean; error?: string } => {
    if (file.size > config.maxSizeBytes) {
        const maxSizeMB = (config.maxSizeBytes / (1024 * 1024)).toFixed(1);
        return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
    }

    if (!config.allowedTypes.includes(file.type)) {
        return { valid: false, error: `File type not allowed. Allowed: ${config.allowedTypes.join(', ')}` };
    }

    return { valid: true };
};

/**
 * Content Security Policy nonce generator
 */
export const generateNonce = (): string => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
};

/**
 * Detect potential injection attempts
 */
export const detectInjection = (input: string): boolean => {
    const patterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /data:text\/html/i,
        /expression\s*\(/i,
        /url\s*\(/i,
        /@import/i,
        /binding:/i,
    ];

    return patterns.some((pattern) => pattern.test(input));
};
