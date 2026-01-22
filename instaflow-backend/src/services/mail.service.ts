import nodemailer from 'nodemailer';
import { config } from '../config';
import logger from '../utils/logger';

export class MailService {
    private static transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: {
            user: config.SMTP_USER,
            pass: config.SMTP_PASS,
        },
    });

    private static getBaseTemplate(content: string, title: string) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }
                .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee; }
                .logo { font-size: 24px; font-weight: bold; color: #6366f1; text-decoration: none; }
                .content { padding: 30px 0; line-height: 1.6; }
                .otp { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e1b4b; background: #f3f4f6; padding: 10px 20px; border-radius: 8px; display: inline-block; margin: 20px 0; }
                .footer { text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #eee; padding-top: 20px; }
                .button { background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <a href="https://instaflow.me" class="logo">InstaFlow</a>
                </div>
                <div class="content">
                    <h2 style="margin-top: 0;">${title}</h2>
                    ${content}
                </div>
                <div class="footer">
                    &copy; ${new Date().getFullYear()} InstaFlow. All rights reserved.<br>
                    Building the future of Instagram automation.
                </div>
            </div>
        </body>
        </html>
        `;
    }

    static async sendVerificationEmail(email: string, code: string) {
        const content = `
            <p>Welcome to InstaFlow! Please use the following code to verify your email address:</p>
            <div style="text-align: center;">
                <span class="otp">${code}</span>
            </div>
            <p>This code will expire in 1 hour.</p>
        `;
        return this.sendMail(email, 'Verify your email - InstaFlow', this.getBaseTemplate(content, 'Verify your Email'));
    }

    static async sendOtpEmail(email: string, otp: string) {
        const content = `
            <p>Your one-time password (OTP) for logging into InstaFlow is:</p>
            <div style="text-align: center;">
                <span class="otp">${otp}</span>
            </div>
            <p>This code is valid for 5 minutes. Please do not share this code with anyone.</p>
        `;
        return this.sendMail(email, 'Your Login OTP - InstaFlow', this.getBaseTemplate(content, 'Login Verification'));
    }

    static async sendResetPasswordEmail(email: string, code: string) {
        const content = `
            <p>We received a request to reset your InstaFlow password. Use the following code to proceed:</p>
            <div style="text-align: center;">
                <span class="otp">${code}</span>
            </div>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p>This code will expire in 15 minutes.</p>
        `;
        return this.sendMail(email, 'Reset your password - InstaFlow', this.getBaseTemplate(content, 'Password Reset'));
    }

    private static async sendMail(to: string, subject: string, html: string) {
        try {
            await this.transporter.sendMail({
                from: `"InstaFlow" <${config.SMTP_FROM}>`,
                to,
                subject,
                html,
            });
            logger.info(`Email sent successfully to ${to}`);
        } catch (error) {
            logger.error({ err: error }, `Failed to send email to ${to}`);
            // In production, we don't want to crash the request if email fails, 
            // but for OTP/Verification it's critical.
            throw new Error('Could not send email. Please try again later.');
        }
    }
}
