import { Request, Response } from "express";
import { InstagramService } from "../services/instagram.service";
import { prisma } from "../prisma";
import { decryptToken } from "../utils/decryption.util";

export class InstagramController {

  // LOGIN URL
  static async loginUrl(req: Request, res: Response) {
    const tenantId = req.user.tenantId;
    const url = InstagramService.getLoginUrl(tenantId);
    res.json({ url });
  }

  // CALLBACK
  static async callback(req: Request, res: Response) {
    try {
      const { code, state } = req.query;
      const tenantId = state as string;
      console.log("OAuth Callback received. Code:", code, "State:", state);

      const short = await InstagramService.exchangeCodeForToken(code as string);
      const long = await InstagramService.getLongLivedToken(short.access_token);
      const igUser = await InstagramService.getInstagramUser(long.access_token);
      // console.log("IG User:", igUser);
      // console.log("long:", long);
      // console.log("short:", short);

      const account = await InstagramService.saveAccount(tenantId, igUser, long.access_token);

      const wantsJson =
        req.query.popup === "1" ||
        req.headers.accept?.includes("application/json") ||
        req.xhr;

      if (wantsJson) {
        return res.json({
          success: true,
          account: {
            igUserId: account.igUserId,
            igBusinessId: account.igBusinessId,
            igUsername: account.igUsername,
          },
        });
      }

      const redirectUrl =
        process.env.WEB_APP_URL ||
        process.env.FRONTEND_URL ||
        "http://localhost:3000";
      return res.redirect(redirectUrl);

    } catch (err: any) {
      console.error(err.message);
      res.status(400).json({ message: "Instagram connection failed", error: err.message });
    }
  }

  // DISCONNECT
  static async disconnect(req: Request, res: Response) {
    await InstagramService.disconnect(req.user.tenantId);
    res.json({ message: "Instagram disconnected" });
  }

  // VERIFY
  static async verify(req: Request, res: Response) {
    const result = await InstagramService.verifyConnection(req.user.tenantId);
    res.json(result);
  }

  static async getProfile(req: any, res: any) {
    try {
      const account = await prisma.iGAccount.findFirst({
        where: { tenantId: req.user.tenantId, isActive: true },
      });

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId, isVerified: true },
      });

      if (!account)
        return res.status(200).json({ message: "No IG account connected", profile: {isIGconnected: false, userFullName: user?.name, userEmail: user?.email} });

      const token = decryptToken(account);

      const profile = await InstagramService.getInstagramUser(token);
      profile.isIGconnected = true;
      profile.userFullName = user?.name;
      profile.userEmail = user?.email;
      res.json({ profile });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }

  static async getPosts(req: any, res: any) {
    await InstagramService.getPosts(req, res);
  }

  static async getComments(req: any, res: any) {
    await InstagramService.getComments(req, res);
  }

  static async subscribeToComments(req: any, res: any) {
    try {
      await InstagramService.subcribeToComments(req.user.tenantId);
      res.json({ message: "Subscribed to comments successfully" });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }
}
