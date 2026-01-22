import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import {
    signupSchema,
    loginSchema,
    verifyEmailSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyResetCodeSchema,
    sendOtpSchema,
    verifyOtpSchema,
    googleLoginSchema
} from '../schema/auth.schema';

// import rateLimit from 'express-rate-limit';

// const authLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 5, // 5 attempts per 15 minutes
//     standardHeaders: true,
//     legacyHeaders: false,
//     message: { error: 'Too many authentication attempts, please try again after 15 minutes.' }
// });

const router = Router();

router.post('/signup', validate(signupSchema), AuthController.signup);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/verify-email', validate(verifyEmailSchema), AuthController.verifyEmail);
router.post('/refresh', validate(refreshTokenSchema), AuthController.refreshToken);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/verify-reset-code', validate(verifyResetCodeSchema), AuthController.verifyResetCode);
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);
router.post('/otp/send', validate(sendOtpSchema), AuthController.sendOtp);
router.post('/otp/verify', validate(verifyOtpSchema), AuthController.verifyOtp);
router.post('/google-login', validate(googleLoginSchema), AuthController.googleLogin);

export default router;
