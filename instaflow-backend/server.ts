import 'dotenv/config'; 
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import path from "path";
import { DatabaseService } from './db';
import authRoutes from "./routes/auth.routes";
import instaRoutes from "./routes/instagram.routes";
import automateRoutes from "./routes/automation.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import analyticsRoutes from "./routes/analytics.routes";
import { prisma } from "./prisma";
import "./workers";
import { registerBullMQUI } from "./bullmq";


const swaggerUi = require("swagger-ui-express");



const app = express();

app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(express.urlencoded({ extended: true }));

registerBullMQUI(app);


const PORT = process.env.PORT || 4000;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'https://hlj5826b-3000.inc1.devtunnels.ms/auth-callback/'; 

(async () => {
  try {
    await prisma.$connect();
    console.log("Connected to database");
  } catch (err) {
    console.error("DB connection error:", err);
  }
})();


app.use("/auth", authRoutes);
app.use ("/instagram", instaRoutes);
app.use("/automate", automateRoutes);
app.use("/subscription", subscriptionRoutes);
app.use("/api", analyticsRoutes);  // Analytics and click tracking
const openapiPath = path.join(process.cwd(), "docs", "openapi.yaml");


app.get("/docs/openapi.yaml", (req, res) => {
  res.sendFile(openapiPath);
});

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: { url: "/docs/openapi.yaml" },
  })
);

app.get("/webhook/instagram", (req, res) => {

  console.log("Received Instagram Webhook GET");

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const VERIFY_TOKEN = process.env.IG_WEBHOOK_VERIFY_TOKEN;

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

app.post("/webhook/instagram", async (req, res) => {
  // Delegate to InstagramWebhookController
  console.log("Received Instagram Webhook POST");
  const { InstagramWebhookController } = await import("./webhook/instagram.webhook");
  InstagramWebhookController.handleWebhook(req, res);
});


/**
 * 1. OAuth Callback Handler
 * This endpoint is called after the user authorizes your app on Meta.
 */

app.post("/api/auth/callback", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Missing code" });

  try {
    /**
     * A) Exchange code -> short-lived Instagram User Access Token
     * Endpoint expects x-www-form-urlencoded body
     */
    const form = new URLSearchParams();
    form.append("client_id", CLIENT_ID);
    form.append("client_secret", CLIENT_SECRET);
    form.append("grant_type", "authorization_code");
    form.append("redirect_uri", REDIRECT_URI); // must EXACTLY match the one used in dialog/oauth
    form.append("code", code);

  
    const shortLivedResponse = await axios.post(
      "https://api.instagram.com/oauth/access_token",
      form,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    // console.log("Short-lived token response:", shortLivedResponse.data);

    // Typically returns { access_token, user_id }
    const shortLivedToken = shortLivedResponse.data.access_token;
    const igUserId = shortLivedResponse.data.user_id;

    // if (!shortLivedToken || !igUserId) {
    //   return res.status(500).json({
    //     success: false,
    //     error: "Token exchange succeeded but access_token/user_id missing",
    //     raw: shortLivedResponse.data,
    //   });
    // }

    /**
     * B) Exchange short-lived -> long-lived (60 days)
     */
    const longLivedResponse = await axios.get(
      "https://graph.instagram.com/access_token",
      {
        params: {
          grant_type: "ig_exchange_token",
          client_secret: CLIENT_SECRET,
          access_token: shortLivedToken,
        },
      }
    );

    const longLivedToken = longLivedResponse.data.access_token;
    const expiresIn = longLivedResponse.data.expires_in;
    // console.log("Long-lived token response:", longLivedResponse.data);


    if (!longLivedToken) {
      return res.status(500).json({
        success: false,
        error: "Long-lived token exchange failed (no access_token returned)",
        raw: longLivedResponse.data,
      });
    }

    /**
     * C) Fetch IG profile
     * Note: Depending on which Instagram product you're using, profile fields can vary.
     * Start simple and add fields after permissions are approved.
     */
    const profileResponse = await axios.get(`https://graph.instagram.com/me`, {
      params: {
        fields: "id,username,account_type,media_count,profile_picture_url,followers_count,follows_count",
        access_token: longLivedToken,
      },
    });

    const profile = profileResponse.data;

    /**
     * D) Persist to DB (no pageAccessToken in IG-direct flow)
     */
    const account = DatabaseService.linkIGAccount("current-user-id", {
      instagramUserId: igUserId,
      userAccessToken: longLivedToken,
      expiresIn, // seconds
      username: profile.username,
      accountType: profile.account_type,
      profilePictureUrl: profile.profile_picture_url,
      mediaCount: profile.media_count,
      followersCount: profile.followers_count,
      followsCount: profile.follows_count,
    });

    return res.json({ success: true, account });
  } catch (error: any) {
    const errData = error?.response?.data || error?.message;
    console.error("Auth Error:", errData);
    return res.status(500).json({ success: false, error: errData });
  }
});


/**
 * 2. Fetch User Posts
 */
app.get('/api/posts', async (req, res) => {
  const account = DatabaseService.getAccountByUserId('current-user-id');

  // if (!account) return res.status(401).json({ error: 'Not connected' });

  try {
    const response = await axios.get(`https://graph.instagram.com/me/media`, {
      params: {
        fields: 'id,caption,media_url,media_type,timestamp,like_count,comments_count',
        access_token: account.userAccessToken
      }
    });
    console.log(response.data);
    res.json(response.data.data);
  } catch (error) {
    console.error('Fetch posts error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

/**
 * 3. Rule Management Endpoints
 */
app.post('/api/rules', (req, res) => {
  const rule = DatabaseService.saveRule(req.body);
  res.json(rule);
});

app.get('/api/rules', (req, res) => {
  res.json(DatabaseService.getAllRules());
});

app.get('/api/comments', async (req, res) => {
  const account = DatabaseService.getAccountByUserId('current-user-id');
  const postId = req.query.postId as string;

  console.log("Fetching comments for postId:", postId);
  console.log("Account:", account);


  if (!account) return res.status(401).json({ error: 'Not connected' });
  if (!postId) return res.status(400).json({ error: 'Missing postId' });

  try {
    const response = await axios.get(`https://graph.instagram.com/v24.0/${postId}/comments`, {
      params: {
        fields: 'id,text,username,timestamp',
        access_token: account.userAccessToken
      }
    });
    console.log("Comments response data:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Fetch comments error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/direct-dm', async (req, res) => {
  const account = DatabaseService.getAccountByUserId('current-user-id');
  const { recipientId, message } = req.body;

  if (!account) return res.status(401).json({ error: 'Not connected' });
  if (!recipientId || !message) {
    return res.status(400).json({ error: 'Missing recipientUsername or message' });
  }

  try {

    const dmResponse = await axios.post(`https://graph.instagram.com/v24.0/${account.instagramUserId}/messages`, {
      recipient: { id: recipientId },
      message
    }, {
      params: {
        access_token: account.userAccessToken
      }
    });

    res.json(dmResponse.data);
  } catch (error) {
    console.error('Direct message error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send direct message' });
  }
});



/**
 * 4. Logging
 */
app.get('/api/logs', (req, res) => {
  res.json(DatabaseService.getLogs());
});

app.listen(PORT, () => console.log(`InstaFlow API active on port ${PORT}`));
