import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { prisma } from '../prisma';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.util';
import { MailService } from './mail.service';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

export class AuthService {
    static async checkAndIncrementRateLimit(user: any) {
        const now = new Date();
        const limitReset = user.otpRateLimitReset;

        // Reset if we're past the reset time or if it's not set
        if (!limitReset || now > limitReset) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    otpRateLimitCount: 1,
                    otpRateLimitReset: new Date(now.getTime() + 60 * 60 * 1000), // 1hr
                },
            });
            return;
        }

        // Check limit
        if (user.otpRateLimitCount >= 10) {
            throw AppError.tooManyRequests('Maximum OTP limit reached. Please try again in 1 hour.');
        }

        // Increment
        await prisma.user.update({
            where: { id: user.id },
            data: {
                otpRateLimitCount: { increment: 1 },
            },
        });
    }

    static async signup(email: string, password: string, name: string) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing && existing.isVerified) {
            if (existing.googleId) {
                throw AppError.conflict('Current account is registered with Google. Please login with Google instead.');
            }
            throw AppError.conflict('Email already exists');
        }

        const hash = await bcrypt.hash(password, 12);

        // Find or create tenant (if we want to reuse tenant for same email but different signup attempt)
        let tenantId = existing?.tenantId;
        if (!tenantId) {
            const tenant = await prisma.tenant.create({
                data: { name: name || email.split('@')[0] },
            });
            tenantId = tenant.id;
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationExpiry = new Date(Date.now() + 1000 * 60 * 60);

        let user;
        if (existing && !existing.isVerified) {
            user = await prisma.user.update({
                where: { id: existing.id },
                data: {
                    password: hash,
                    tenantId,
                    verificationCode,
                    verificationExpiry,
                    name,
                },
            });
        } else {
            user = await prisma.user.create({
                data: {
                    email,
                    password: hash,
                    tenantId,
                    verificationCode,
                    verificationExpiry,
                    name,
                },
            });
        }

        // Check rate limit if user exists
        if (existing) {
            await this.checkAndIncrementRateLimit(existing);
        }

        await MailService.sendVerificationEmail(email, verificationCode);
        return { user };
    }

    static async login(email: string, password: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw AppError.unauthorized('Invalid email or password');

        if (!user.isVerified) throw AppError.unauthorized('Please verify your email first');
        if (user.googleId) throw AppError.unauthorized('Account uses Google login. Please login with Google.');

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) throw AppError.unauthorized('Invalid email or password');

        // Generate OTP for login
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 1000 * 60 * 5); // 5 mins

        await prisma.user.update({
            where: { id: user.id },
            data: { otpCode: otp, otpExpiry },
        });

        await MailService.sendOtpEmail(email, otp);

        return { otpRequired: true, email };
    }

    static async verifyEmail(email: string, code: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw AppError.notFound('User not found');

        logger.info(`User verification code: ${user.verificationCode}`);
        logger.info(`User verification expiry: ${user.verificationExpiry}`);
        logger.info(`User verification code: ${code}`);
        logger.info(`User verification expiry: ${new Date()}`);
        if (user.verificationCode !== code) throw AppError.unauthorized('Invalid verification code');
        if (user.verificationExpiry! < new Date()) throw AppError.unauthorized('Verification code expired');

        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationCode: null,
                verificationExpiry: null,
            },
        });

        return { message: 'Email verified successfully' };
    }

    static async refreshToken(refreshToken: string) {
        const jwt = require('jsonwebtoken');

        try {
            const payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
            const accessToken = generateAccessToken({
                userId: payload.userId,
                tenantId: payload.tenantId,
                role: payload.role || 'user'
            });
            return { accessToken };
        } catch {
            throw AppError.unauthorized('Invalid refresh token');
        }
    }

    static async logout(token: string) {
        // blacklistToken(token); // To be implemented or updated
        return { message: 'Logged out successfully' };
    }

    static async forgotPassword(email: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Don't reveal if email exists
            return { message: 'If an account exists with that email, a reset code has been sent.' };
        }

        // Block Google users from resetting password
        if (user.googleId) {
            throw AppError.badRequest('This account uses Google Sign-In. Please login with Google instead.');
        }

        // Check rate limit
        await this.checkAndIncrementRateLimit(user);

        // Generate 6-digit OTP for password reset
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 15); // 15 min

        await prisma.user.update({
            where: { id: user.id },
            data: { resetToken: resetCode, resetTokenExpiry },
        });

        await MailService.sendResetPasswordEmail(user.email, resetCode);
        return { message: 'Reset code sent to your email.' };
    }

    static async verifyResetCode(email: string, code: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.resetToken !== code) {
            throw new AppError('Invalid reset code', 400);
        }

        if (user.resetTokenExpiry! < new Date()) {
            throw new AppError('Reset code expired', 400);
        }

        return { valid: true, message: 'Code verified successfully' };
    }

    static async resetPassword(email: string, token: string, newPassword: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.resetToken !== token) {
            throw new AppError('Invalid or expired reset code', 400);
        }

        if (user.resetTokenExpiry! < new Date()) {
            throw new AppError('Reset code expired', 400);
        }

        const hashed = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashed,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        return { message: 'Password reset successful' };
    }

    static async googleAuth(idToken: string) {
        try {
            if (!config.GOOGLE_CLIENT_ID) {
                throw new Error('Google Client ID is not configured');
            }

            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: config.GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            if (!payload || !payload.email) throw AppError.unauthorized('Invalid Google token');

            const { email, name, sub: googleId, picture: avatarUrl } = payload;

            let user = await prisma.user.findUnique({ where: { email } });

            if (!user) {
                const tenant = await prisma.tenant.create({
                    data: { name: name || email.split('@')[0] },
                });

                user = await prisma.user.create({
                    data: {
                        email,
                        name: name || email.split('@')[0],
                        googleId,
                        avatarUrl,
                        isVerified: true,
                        tenantId: tenant.id,
                        password: '', // No password for Google users
                    },
                });
            } else if (!user.googleId) {
                // strict mutual exclusivity: if registered with password, don't allow google login
                throw AppError.badRequest('This account uses Email/Password. Please login with your credentials.');
            } else {
                // Already has googleId, update avatar if changed
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { avatarUrl },
                });
            }

            const tenant = await prisma.tenant.findFirst({
                where: { id: user.tenantId },
                include: { igAccounts: true },
            });

            const isIGconnected = (tenant?.igAccounts?.length || 0) > 0;

            const accessToken = generateAccessToken({
                userId: user.id,
                tenantId: user.tenantId,
                role: user.role,
                isIGconnected
            });
            const refreshToken = generateRefreshToken({ userId: user.id, tenantId: user.tenantId });

            return { user, accessToken, refreshToken, isIGconnected };
        } catch (error: any) {
            console.error('Google Auth Error:', error);
            throw AppError.unauthorized(error.message || 'Google authentication failed');
        }
    }

    static async sendOtp(email: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw AppError.notFound('User not found');

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 1000 * 60 * 5); // 5 mins

        await prisma.user.update({
            where: { id: user.id },
            data: { otpCode: otp, otpExpiry },
        });

        await MailService.sendOtpEmail(email, otp);
        return { message: 'OTP sent' };
    }

    static async verifyOtp(email: string, otp: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw AppError.notFound('User not found');

        if (user.otpCode !== otp) throw AppError.unauthorized('Invalid OTP');
        if (user.otpExpiry! < new Date()) throw AppError.unauthorized('OTP expired');
        if (user.googleId) throw AppError.badRequest('This account uses Google. Please login with your Google account.');

        const tenant = await prisma.tenant.findFirst({
            where: { id: user.tenantId },
            include: { igAccounts: true },
        });

        const isIGconnected = (tenant?.igAccounts?.length || 0) > 0;

        const accessToken = generateAccessToken({
            userId: user.id,
            tenantId: user.tenantId,
            role: user.role,
            isIGconnected
        });
        const refreshToken = generateRefreshToken({ userId: user.id, tenantId: user.tenantId });

        await prisma.user.update({
            where: { id: user.id },
            data: { otpCode: null, otpExpiry: null },
        });

        return { user, accessToken, refreshToken, isIGconnected };
    }
}
