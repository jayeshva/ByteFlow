import { z } from 'zod';

export const signupSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(2),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string(),
    }),
});

export const verifyEmailSchema = z.object({
    body: z.object({
        email: z.string().email(),
        code: z.string().length(6),
    }),
});

export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string(),
    }),
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email(),
    }),
});

export const resetPasswordSchema = z.object({
    body: z.object({
        email: z.string().email(),
        token: z.string(),
        password: z.string().min(8),
    }),
});

export const verifyResetCodeSchema = z.object({
    body: z.object({
        email: z.string().email(),
        code: z.string().length(6),
    }),
});

export const sendOtpSchema = z.object({
    body: z.object({
        email: z.string().email(),
    }),
});

export const verifyOtpSchema = z.object({
    body: z.object({
        email: z.string().email(),
        otp: z.string().length(6),
    }),
});

export const googleLoginSchema = z.object({
    body: z.object({
        idToken: z.string(),
    }),
});
