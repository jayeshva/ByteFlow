import axios from "axios";
import { prisma } from "../prisma";
import { IG } from "../config/instagram";
import { encryptToken } from "../utils/encryption.util";
import { decryptToken } from "../utils/decryption.util";

export class InstagramService {
  // ------------------------------------------------------
  // STEP 1: Generate Instagram Login URL
  // ------------------------------------------------------
  static getLoginUrl(tenantId: string) {

    const scopes = [
      "instagram_business_basic",
      "instagram_business_manage_messages",
      "instagram_business_manage_comments",
      "instagram_business_content_publish",
      "instagram_business_manage_insights",
    ].join(",");

    return `https://www.instagram.com/oauth/authorize?client_id=${IG.CLIENT_ID}&redirect_uri=${IG.REDIRECT_URI}&response_type=code&scope=${scopes}&state=${tenantId}`;

    // return (
    //   `https://www.facebook.com/v20.0/dialog/oauth?client_id=${IG.CLIENT_ID}` +
    //   `&redirect_uri=${IG.REDIRECT_URI}` +
    //   `&scope=${scopes}&response_type=code&state=${tenantId}`
    // );
  }

  // ------------------------------------------------------
  // STEP 2: Handle Callback → Exchange code for short-lived token
  // ------------------------------------------------------
  static async exchangeCodeForToken(code: string) {

    const url = `https://api.instagram.com/oauth/access_token`;

    const form = new URLSearchParams();
    form.append("client_id", IG.CLIENT_ID);
    form.append("client_secret", IG.CLIENT_SECRET);
    form.append("grant_type", "authorization_code");
    form.append("redirect_uri", IG.REDIRECT_URI); 
    form.append("code", code);

    // console.log("Exchanging code for token with form data:", form.toString());

    const res = await axios.post(url, form);
    return res.data; // { access_token, token_type, expires_in }


  }

  // ------------------------------------------------------
  // STEP 3: Exchange short-lived → long-lived token
  // ------------------------------------------------------
  static async getLongLivedToken(shortToken: string) {
    // const url =
    //   `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token` +
    //   `&client_id=${IG.CLIENT_ID}` +
    //   `&client_secret=${IG.CLIENT_SECRET}` +
    //   `&fb_exchange_token=${shortToken}`;

    // const res = await axios.get(url);
    // return res.data; // { access_token, expires_in }
    const url = `https://graph.instagram.com/access_token`;

    const res = await axios.get(url, {
      params: {
        grant_type: "ig_exchange_token",
        client_secret: IG.CLIENT_SECRET,
        access_token: shortToken,
      },
    });
    return res.data; // { access_token, expires_in }
  }

  // ------------------------------------------------------
  // STEP 4: Fetch IG Business Account & User data
  // ------------------------------------------------------
  static async getInstagramUser(longToken: string) {
    const url = `https://graph.instagram.com/v24.0/me?fields=id,user_id,username,name,profile_picture_url,media_count,followers_count,follows_count,account_type,biography&access_token=${longToken}`;

    const res = await axios.get(url);
    return res.data;
  }

  // ------------------------------------------------------
  // STEP 5: Save encrypted token & IG data to DB
  // ------------------------------------------------------
  static async saveAccount(tenantId: string, igData: any, token: string) {
    const encrypted = encryptToken(token);

    // console.log("Saving IG Account for tenant:", tenantId, "IG Data:", igData);
    return prisma.iGAccount.upsert({
      where: { igBusinessId: igData.id },
      create: {
        tenantId,
        igUserId: igData.user_id,
        igBusinessId: igData.id,
        igUsername: igData.username,
        igName: igData.name,
        tokenCiphertext: Buffer.from(encrypted.encryptedToken, "base64"),
        tokenKeyBlob: Buffer.from(encrypted.keyBlob),
        tokenNonce: encrypted.nonce,
        tokenAuthTag: Buffer.from(encrypted.tag, "base64"),
      },
      update: {
        igUsername: igData.username,
        igName: igData.name,
        tokenCiphertext: Buffer.from(encrypted.encryptedToken, "base64"),
        tokenKeyBlob: Buffer.from(encrypted.keyBlob),
        tokenNonce: encrypted.nonce,
        tokenAuthTag: Buffer.from(encrypted.tag, "base64"),
      },
    });
  }

  // ------------------------------------------------------
  // DISCONNECT INSTAGRAM ACCOUNT
  // ------------------------------------------------------
  static async disconnect(tenantId: string) {
    return prisma.iGAccount.updateMany({
      where: { tenantId },
      data: { isActive: false },
    });
  }

  // ------------------------------------------------------
  // VERIFY CONNECTION
  // ------------------------------------------------------
  static async verifyConnection(tenantId: string) {
    const acc = await prisma.iGAccount.findFirst({
      where: { tenantId, isActive: true },
    });

    return acc ? { connected: true, account: acc } : { connected: false };
  }

  static async getPosts(req: any, res: any) {
    try {
      const account = await prisma.iGAccount.findFirst({
        where: { tenantId: req.user.tenantId, isActive: true },
      });

      // console.log("Fetched account from DB:", account);

      if (!account)
        return res.status(404).json({ message: "No IG account connected" });

      const token = decryptToken(account);


      // console.log("Decrypted token:", token);

      const url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,like_count,comments_count,thumbnail_url,timestamp&access_token=${token}`;
      const { data } = await axios.get(url);

      res.json({ posts: data.data });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }

  static async getComments(req: any, res: any) {
    try {
      const { mediaId } = req.params;
      const { after, limit = 25 } = req.query; // Support pagination cursor and limit

      const account = await prisma.iGAccount.findFirst({
        where: { tenantId: req.user.tenantId, isActive: true },
      });

      if (!account)
        return res.status(404).json({ message: "No IG account connected" });

      const token = decryptToken(account);

      // Build URL with pagination parameters
      let url = `https://graph.instagram.com/${mediaId}/comments?fields=id,text,username,from,timestamp,replies{id,text,username,from,timestamp}&limit=${Math.min(Number(limit), 100)}&access_token=${token}`;
      
      // Add cursor for pagination if provided
      if (after) {
        url += `&after=${after}`;
      }

      const { data } = await axios.get(url);

      // Format comments with their replies - fallback to from.username if username is not available
      const commentsWithReplies = data.data.map((comment: any) => ({
        id: comment.id,
        text: comment.text,
        username: comment.username || comment.from?.username || 'Instagram User',
        timestamp: comment.timestamp,
        replies: (comment.replies?.data || []).map((reply: any) => ({
          id: reply.id,
          text: reply.text,
          username: reply.username || reply.from?.username || 'Instagram User',
          timestamp: reply.timestamp,
        })),
      }));

      res.json({ 
        comments: commentsWithReplies,
        paging: {
          hasMore: !!data.paging?.cursors?.after,
          nextCursor: data.paging?.cursors?.after || null,
        }
      });
    } catch (err: any) {
      console.error("Error fetching comments:", err.response?.data || err.message);
      res.status(500).json({ message: err.message });
    }
  }

  static async subcribeToComments(tenantId: string) {
    try {
      const account = await prisma.iGAccount.findFirst({
        where: { tenantId, isActive: true },
      });

      if (!account) throw new Error("No active IG account for tenant");

      const token = decryptToken(account);
      // console.log("Decrypted token for subscription:", token);

      const url = `https://graph.instagram.com/v24.0/${account.igUserId}/subscribed_apps?subscribed_fields=comments&access_token=${token}`;

      const subscribe = await axios.post(
        url
      );

      // console.log("Subscribed to comments:", subscribe.data);
    } catch (err: any) {
      throw new Error(`Subscription failed: ${err}`);
    }
  }

  
}
