import { z } from 'zod';
import { VALIDATION } from '../lib/constants';

/**
 * Authentication Zod Schemas
 * Used for form validation and API response validation
 */

// Email validation
export const emailSchema = z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address');

// Password validation
export const passwordSchema = z
    .string()
    .min(VALIDATION.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number');

// Simple password for login (no regex requirements)
export const loginPasswordSchema = z
    .string()
    .min(1, 'Password is required');

// Name validation
export const nameSchema = z
    .string()
    .min(VALIDATION.NAME_MIN_LENGTH, `Name must be at least ${VALIDATION.NAME_MIN_LENGTH} characters`)
    .max(50, 'Name must be less than 50 characters');

// OTP validation
export const otpSchema = z
    .string()
    .length(VALIDATION.OTP_LENGTH, `Code must be ${VALIDATION.OTP_LENGTH} digits`)
    .regex(/^\d+$/, 'Code must contain only numbers');

// Login Form Schema
export const loginFormSchema = z.object({
    email: emailSchema,
    password: loginPasswordSchema,
});

// Signup Form Schema
export const signupFormSchema = z.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
});

// Email Verification Schema
export const verifyEmailSchema = z.object({
    email: emailSchema,
    code: otpSchema,
});

// Forgot Password Schema
export const forgotPasswordSchema = z.object({
    email: emailSchema,
});

// Reset Password Schema
export const resetPasswordSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

// API Response Schemas
export const authResponseSchema = z.object({
    success: z.boolean(),
    user: z.object({
        id: z.string().optional(),
        email: z.string().optional(),
        name: z.string().optional(),
        isIGConnected: z.boolean().optional(),
    }).optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    message: z.string().optional(),
    error: z.string().optional(),
});

export const tokenRefreshResponseSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string().optional(),
});

// Type exports
export type LoginFormData = z.infer<typeof loginFormSchema>;
export type SignupFormData = z.infer<typeof signupFormSchema>;
export type VerifyEmailData = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
