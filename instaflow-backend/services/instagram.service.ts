import axios, { AxiosError } from "axios";
import { prisma } from "../prisma";
import { IG } from "../config/instagram";
import { encryptToken } from "../utils/encryption.util";
import { decryptToken } from "../utils/decryption.util";

// Token expired error codes from Instagram API
const TOKEN_EXPIRED_CODES = [190, 102, 463];
const TOKEN_EXPIRED_SUBCODES = [458, 460, 463];

export class InstagramService {

  // ------------------------------------------------------
  // REFRESH TOKEN - Get new long-lived token
  // Instagram long-lived tokens are valid for 60 days and can be refreshed
  // when they have at least 24 hours of validity remaining
  // ------------------------------------------------------
  static async refreshToken(currentToken: string): Promise<string | null> {
    try {
      console.log("🔄 Refreshing Instagram access token...");
      
      const url = `https://graph.instagram.com/refresh_access_token`;
      const res = await axios.get(url, {
        params: {
          grant_type: "ig_refresh_token",
          access_token: currentToken,
        },
      });

      const newToken = res.data.access_token;
      console.log("✅ Token refreshed successfully");
      return newToken;
    } catch (err: any) {
      console.error("❌ Token refresh failed:", err.response?.data || err.message);
      return null;
    }
  }

  // ------------------------------------------------------
  // UPDATE TOKEN IN DATABASE
  // ------------------------------------------------------
  static async updateToken(igAccountId: string, newToken: string): Promise<void> {
    const encrypted = encryptToken(newToken);
    
    await prisma.iGAccount.update({
      where: { id: igAccountId },
      data: {
        tokenCiphertext: Buffer.from(encrypted.encryptedToken, "base64"),
        tokenKeyBlob: Buffer.from(encrypted.keyBlob),
        tokenNonce: encrypted.nonce,
        tokenAuthTag: Buffer.from(encrypted.tag, "base64"),
      },
    });
    
    console.log("✅ Token updated in database for account:", igAccountId);
  }

  // ------------------------------------------------------
  // CHECK IF ERROR IS TOKEN EXPIRED
  // ------------------------------------------------------
  static isTokenExpiredError(error: any): boolean {
    const data = error?.response?.data?.error;
    if (!data) return false;
    
    const code = data.code;
    const subcode = data.error_subcode;
    
    return TOKEN_EXPIRED_CODES.includes(code) || 
           TOKEN_EXPIRED_SUBCODES.includes(subcode) ||
           data.message?.toLowerCase().includes("token") ||
           data.message?.toLowerCase().includes("expired");
  }

  // ------------------------------------------------------
  // EXECUTE API CALL WITH AUTO TOKEN REFRESH
  // Wraps any Instagram API call and automatically refreshes token if expired
  // ------------------------------------------------------
  static async executeWithTokenRefresh<T>(
    igAccountId: string,
    token: string,
    apiCall: (token: string) => Promise<T>
  ): Promise<T> {
    try {
      // First attempt
      return await apiCall(token);
    } catch (error: any) {
      // Check if token expired
      if (this.isTokenExpiredError(error)) {
        console.log("⚠️ Token expired, attempting refresh...");
        
        // Try to refresh the token
        const newToken = await this.refreshToken(token);
        
        if (newToken) {
          // Update token in database
          await this.updateToken(igAccountId, newToken);
          
          // Retry the API call with new token
          console.log("🔁 Retrying API call with new token...");
          return await apiCall(newToken);
        }
      }
      
      // Re-throw if not a token error or refresh failed
      throw error;
    }
  }
  
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

      if (!account)
        return res.status(404).json({ message: "No IG account connected" });

      const token = decryptToken(account);

      // Use auto-refresh wrapper for API call
      const data = await this.executeWithTokenRefresh(
        account.id,
        token,
        async (currentToken) => {
          const url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,like_count,comments_count,thumbnail_url,timestamp&access_token=${currentToken}`;
          const response = await axios.get(url);
          return response.data;
        }
      );

      res.json({ posts: data.data });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }

  static async getComments(req: any, res: any) {
    try {
      const { mediaId } = req.params;
      const { after, limit = 25 } = req.query;

      const account = await prisma.iGAccount.findFirst({
        where: { tenantId: req.user.tenantId, isActive: true },
      });

      if (!account)
        return res.status(404).json({ message: "No IG account connected" });

      const token = decryptToken(account);

      // Use auto-refresh wrapper for API call
      const data = await this.executeWithTokenRefresh(
        account.id,
        token,
        async (currentToken) => {
          let url = `https://graph.instagram.com/${mediaId}/comments?fields=id,text,username,from,timestamp,replies{id,text,username,from,timestamp}&limit=${Math.min(Number(limit), 100)}&access_token=${currentToken}`;
          
          if (after) {
            url += `&after=${after}`;
          }

          const response = await axios.get(url);
          return response.data;
        }
      );

      // Get the account's username to use as fallback and for filtering
      const accountUsername = account.igUsername || 'bytebees';

      // First, collect all reply IDs to filter them from top-level comments
      // Instagram API returns replies both as top-level AND nested, causing duplicates
      const replyIds = new Set<string>();
      data.data.forEach((comment: any) => {
        if (comment.replies?.data) {
          comment.replies.data.forEach((reply: any) => {
            replyIds.add(reply.id);
          });
        }
      });

      // Known bot reply patterns (messages sent by the automation)
      const botReplyPatterns = [
        "Thanks! Please see DMs.",
        "Sent you a message! Check it out!",
        "Nice! Check your DMs!",
        "Check your inbox!",
        "DM sent!",
      ];

      // Helper to check if a comment is a bot reply
      const isBotReply = (comment: any) => {
        const username = comment.username || comment.from?.username || '';
        const text = comment.text || '';
        
        // If it's from the account owner AND matches a known bot reply pattern
        if (username.toLowerCase() === accountUsername.toLowerCase()) {
          return botReplyPatterns.some(pattern => 
            text.toLowerCase().includes(pattern.toLowerCase())
          );
        }
        return false;
      };

      // Format comments, excluding those that are actually replies or bot replies
      const commentsWithReplies = data.data
        .filter((comment: any) => !replyIds.has(comment.id)) // Exclude nested replies
        .filter((comment: any) => !isBotReply(comment)) // Exclude bot replies at top-level
        .map((comment: any) => ({
          id: comment.id,
          text: comment.text,
          username: comment.username || comment.from?.username || 'Instagram User',
          timestamp: comment.timestamp,
          replies: (comment.replies?.data || []).map((reply: any) => ({
            id: reply.id,
            text: reply.text,
            // Use account username if the reply shows "Instagram User" and matches bot patterns
            username: reply.username || reply.from?.username || accountUsername,
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

  // ------------------------------------------------------
  // Check if a user follows the account
  // Note: Instagram API has limits on follower lookup. This checks
  // a sample of followers. For accounts with many followers,
  // this may not find the user even if they follow.
  // ------------------------------------------------------
  static async checkUserFollows(token: string, targetUserId: string): Promise<boolean> {
    try {
      // Get followers list (paginated, limited to recent followers)
      const url = `https://graph.instagram.com/v24.0/me/followers?access_token=${token}`;
      const res = await axios.get(url);
      
      const followers = res.data?.data || [];
      const isFollowing = followers.some((f: any) => f.id === targetUserId);
      
      console.log(`🔍 Checking if ${targetUserId} follows account: ${isFollowing}`);
      return isFollowing;
    } catch (err: any) {
      // If API fails (e.g., permissions), assume not following
      console.error("❌ Failed to check followers:", err.response?.data || err.message);
      return false;
    }
  }

  
}
