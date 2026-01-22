import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
    static async signup(req: Request, res: Response) {
        const { email, password, name } = req.body;
        const result = await AuthService.signup(email, password, name);

        res.status(201).json({
            success: true,
            message: 'Signup successful. Please verify your email.',
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    tenantId: result.user.tenantId,
                    name: result.user.name,
                },
            },
        });
    }

    static async login(req: Request, res: Response) {
        const { email, password } = req.body;
        const result = await AuthService.login(email, password);

        if (result.otpRequired) {
            return res.status(200).json({
                success: true,
                message: 'OTP sent to your email. Please verify to continue.',
                data: { otpRequired: true, email: result.email },
            });
        }

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: (result as any).user.id,
                    email: (result as any).user.email,
                    tenantId: (result as any).user.tenantId,
                    role: (result as any).user.role,
                    isIGConnected: (result as any).isIGconnected,
                },
                accessToken: (result as any).accessToken,
                refreshToken: (result as any).refreshToken,
            },
        });
    }

    static async googleLogin(req: Request, res: Response) {
        const { idToken } = req.body;
        const result = await AuthService.googleAuth(idToken);

        res.status(200).json({
            success: true,
            message: 'Google login successful',
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    tenantId: result.user.tenantId,
                    role: result.user.role,
                    isIGConnected: result.isIGconnected,
                },
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            },
        });
    }

    static async verifyEmail(req: Request, res: Response) {
        const { email, code } = req.body;
        const result = await AuthService.verifyEmail(email, code);
        res.status(200).json({ success: true, ...result });
    }

    static async refreshToken(req: Request, res: Response) {
        const { refreshToken } = req.body;
        const result = await AuthService.refreshToken(refreshToken);
        res.status(200).json({ success: true, data: result });
    }

    static async logout(req: Request, res: Response) {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) throw new Error('Token required');
        const result = await AuthService.logout(token);
        res.status(200).json({ success: true, ...result });
    }

    static async forgotPassword(req: Request, res: Response) {
        const { email } = req.body;
        const result = await AuthService.forgotPassword(email);
        res.status(200).json({ success: true, ...result });
    }

    static async resetPassword(req: Request, res: Response) {
        const { email, token, password } = req.body;
        const result = await AuthService.resetPassword(email, token, password);
        res.status(200).json({ success: true, ...result });
    }

    static async verifyResetCode(req: Request, res: Response) {
        const { email, code } = req.body;
        const result = await AuthService.verifyResetCode(email, code);
        res.status(200).json({ success: true, ...result });
    }

    static async sendOtp(req: Request, res: Response) {
        const { email } = req.body;
        const result = await AuthService.sendOtp(email);
        res.status(200).json({ success: true, ...result });
    }

    static async verifyOtp(req: Request, res: Response) {
        const { email, otp } = req.body;
        const result = await AuthService.verifyOtp(email, otp);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    tenantId: result.user.tenantId,
                },
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            },
        });
    }
}
