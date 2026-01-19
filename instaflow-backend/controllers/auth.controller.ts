import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { isBlacklisted } from "../utils/tokenBlacklist.util";

export class AuthController {
  // -----------------------------
  // SIGNUP
  // -----------------------------
  static async signup(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name)
        return res.status(400).json({ message: "Email, password, and name are required" });

      const result = await AuthService.signup(email, password, name);

      return res.status(201).json({
        message: "Signup successful. Please verify your email.",
        user: {
          id: result.user.id,
          email: result.user.email,
          tenantId: result.user.tenantId,
          name: result.user.name,
        },
      });

    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  // -----------------------------
  // LOGIN
  // -----------------------------
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password)
        return res.status(400).json({ message: "Email and password are required" });

      const result = await AuthService.login(email, password);

      return res.status(200).json({
        message: "Login successful",
        user: {
          id: result.user.id,
          email: result.user.email,
          tenantId: result.user.tenantId,
          role: result.user.role,
          isIGConnected: result.isIGconnected
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });

    } catch (err: any) {
      console.log(err);
      res.status(400).json({ message: err.message });
    }
  }

  // -----------------------------
  // EMAIL VERIFICATION
  // -----------------------------
  static async verifyEmail(req: Request, res: Response) {
    try {
      const { email, code } = req.body;

      if (!email || !code)
        return res.status(400).json({ message: "Email and verification code required" });

      const result = await AuthService.verifyEmail(email, code);

      return res.status(200).json(result);

    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  // -----------------------------
  // REFRESH TOKEN
  // -----------------------------
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken)
        return res.status(400).json({ message: "Refresh token required" });

      const result = await AuthService.refreshToken(refreshToken);

      return res.status(200).json(result);

    } catch (err: any) {
      res.status(401).json({ message: err.message });
    }
  }

  // -----------------------------
  // LOGOUT
  // -----------------------------
  static async logout(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(" ")[1];

      if (!token)
        return res.status(400).json({ message: "Token required" });

      const result = await AuthService.logout(token);

      return res.status(200).json(result);

    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  // -----------------------------
  // FORGOT PASSWORD
  // -----------------------------
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email)
        return res.status(400).json({ message: "Email is required" });

      const result = await AuthService.forgotPassword(email);

      return res.status(200).json(result);

    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  // -----------------------------
  // RESET PASSWORD
  // -----------------------------
  static async resetPassword(req: Request, res: Response) {
    try {
      const { email, token, password } = req.body;

      if (!email || !token || !password)
        return res.status(400).json({ message: "Email, token, and new password required" });

      const result = await AuthService.resetPassword(email, token, password);

      return res.status(200).json(result);

    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  // -----------------------------
  // OTP SEND
  // -----------------------------
  static async sendOtp(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email)
        return res.status(400).json({ message: "Email required" });

      const result = await AuthService.sendOtp(email);

      return res.status(200).json(result);

    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  // -----------------------------
  // OTP VERIFY
  // -----------------------------
  static async verifyOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp)
        return res.status(400).json({ message: "Email and OTP required" });

      const result = await AuthService.verifyOtp(email, otp);

      return res.status(200).json({
        message: "Login successful",
        user: {
          id: result.user.id,
          email: result.user.email,
          tenantId: result.user.tenantId,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });

    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }
}
