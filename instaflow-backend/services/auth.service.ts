import bcrypt from "bcrypt";
import { prisma } from "../prisma";
import { v4 as uuid } from "uuid";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.util";
import { sendEmail } from "../utils/email.util";
import { blacklistToken } from "../utils/tokenBlacklist.util";

export class AuthService {
  // -----------------------------
  // SIGNUP
  // -----------------------------
  static async signup(email: string, password: string, name: string) {
    const existing = await prisma.user.findUnique({ where: { email} });
    if (existing && existing.isVerified) throw new Error("Email already exists");

    const hash = await bcrypt.hash(password, 12);

    const tenant = await prisma.tenant.create({
      data: { name: email.split("@")[0] },
    });

    //six digit verification code
    const verificationCode = uuid().split("-")[0].slice(0, 6);
    console.log("Verification Code:", verificationCode);
    const verificationExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    let user;

    if(existing && !existing.isVerified) {
      user =  await prisma.user.update({
        where: { id: existing.id },
        data: {
          password: hash,
          tenantId: tenant.id,
          verificationCode,
          verificationExpiry,
          name
        },
      });
    } else {
       user = await prisma.user.create({
        data: {
          email,
          password: hash,
          tenantId: tenant.id,
          verificationCode,
          verificationExpiry,
          name,
        },
      });
}
    // await sendEmail(email, "Verify your account", `Your code: ${verificationCode}`);

    return { user };
  }

  // -----------------------------
  // LOGIN (email + password)
  // -----------------------------
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("Invalid email or password");

    const IG = await prisma.tenant.findFirst({
      where: { id: user.tenantId },
      include: { igAccounts: true },
    });

    // console.log("IG Connected Accounts:", IG?.igAccounts);


    if (!user.isVerified) throw new Error("Please verify your email first");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Invalid email or password");

    const accessToken = generateAccessToken({ userId: user.id, tenantId: user.tenantId, role: user.role, isIGconnected: IG?.igAccounts.length! > 0 });
    const refreshToken = generateRefreshToken({ userId: user.id, tenantId: user.tenantId });

    return { user, accessToken, refreshToken, isIGconnected: IG?.igAccounts.length! > 0  };
  }

  // -----------------------------
  // EMAIL VERIFICATION
  // -----------------------------
  static async verifyEmail(email: string, code: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("User not found");

    if (user.verificationCode !== code) throw new Error("Invalid verification code");
    if (user.verificationExpiry! < new Date()) throw new Error("Verification code expired");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationCode: null,
        verificationExpiry: null,
      },
    });

    return { message: "Email verified successfully" };
  }

  // -----------------------------
  // REFRESH TOKEN
  // -----------------------------
  static async refreshToken(refreshToken: string) {
    const jwt = require("jsonwebtoken");

    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
      const accessToken = generateAccessToken({ userId: payload.userId, tenantId: payload.tenantId });
      return { accessToken };
    } catch {
      throw new Error("Invalid refresh token");
    }
  }

  // -----------------------------
  // LOGOUT
  // -----------------------------
  static async logout(token: string) {
    blacklistToken(token);
    return { message: "Logged out successfully" };
  }

  // -----------------------------
  // FORGOT PASSWORD
  // -----------------------------
  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("User not found");

    const resetToken = uuid();
    const resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 15); // 15 min

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    await sendEmail(email, "Reset Password", `Reset code: ${resetToken}`);

    return { message: "Reset code sent" };
  }

  // -----------------------------
  // RESET PASSWORD
  // -----------------------------
  static async resetPassword(email: string, token: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.resetToken !== token) throw new Error("Invalid or expired reset token");

    if (user.resetTokenExpiry! < new Date()) throw new Error("Reset token expired");

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: "Password reset successful" };
  }

  // -----------------------------
  // OTP LOGIN
  // -----------------------------
  static async sendOtp(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("User not found");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 1000 * 60 * 5);

    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: otp, otpExpiry },
    });

    await sendEmail(email, "Your OTP", `Your login OTP: ${otp}`);

    return { message: "OTP sent" };
  }

  static async verifyOtp(email: string, otp: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("User not found");

    if (user.otpCode !== otp) throw new Error("Invalid OTP");
    if (user.otpExpiry! < new Date()) throw new Error("OTP expired");

    const accessToken = generateAccessToken({ userId: user.id, tenantId: user.tenantId });
    const refreshToken = generateRefreshToken({ userId: user.id, tenantId: user.tenantId });

    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiry: null },
    });

    return { user, accessToken, refreshToken };
  }
}
