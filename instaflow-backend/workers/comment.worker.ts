import { Worker } from "bullmq";
import { prisma } from "../prisma";
import axios from "axios";
import { decryptToken } from "../utils/decryption.util";

// Anti-spam configuration
const RATE_LIMIT_PER_HOUR = 180; // Stay under 200 limit
const MIN_DELAY_MS = 3000;  // Minimum 3 seconds between DMs
const MAX_DELAY_MS = 8000;  // Maximum 8 seconds between DMs

// Helper: Random delay to avoid spam detection
function randomDelay(): Promise<void> {
  const delay = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Helper: Check if automation timing is active
function isWithinTimingWindow(automation: any): boolean {
  if (!automation.isAutomationTimingEnabled) return true;
  
  const now = new Date();
  if (automation.automationStartTime && new Date(automation.automationStartTime) > now) return false;
  if (automation.automationEndTime && new Date(automation.automationEndTime) < now) return false;
  return true;
}

const commentWorker = new Worker(
  "comment_events",
  async job => {
    const event = job.data;
    
    // Use username as fallback for senderId (senderId should be IGSID from webhook 'from.id')
    const senderId = event.senderId || event.from?.id || event.username;
    
    console.log("📥 Processing comment event:", { 
      mediaId: event.mediaId, 
      text: event.text?.substring(0, 50),
      username: event.username,
      senderId,
      commentId: event.commentId
    });

    // 1) Find tenant via IG Business ID
    const igAccount = await prisma.iGAccount.findUnique({
      where: { igUserId: event.tenantId }
    });

    if (!igAccount) {
      console.log("⚠️ No IG account matches this tenant");
      return;
    }

    const tenantId = igAccount.tenantId;

    // 2) Check hourly rate limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentDMs = await prisma.messageLog.count({
      where: {
        tenantId,
        status: "SENT",
        createdAt: { gte: oneHourAgo }
      }
    });

    if (recentDMs >= RATE_LIMIT_PER_HOUR) {
      console.log("⛔ Rate limit reached. Skipping to avoid spam detection.");
      await prisma.messageLog.create({
        data: {
          tenantId,
          igBusinessId: igAccount.igBusinessId,
          mediaId: event.mediaId,
          commentId: event.commentId,
          senderId: event.senderId,
          status: "SKIPPED",
          errorCode: "RATE_LIMIT"
        }
      });
      return;
    }

    // 2.5) Check subscription quota (monthly DM limit based on plan)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: { include: { plan: true } },
        plan: true,
      },
    });

    if (tenant) {
      const plan = tenant.subscription?.plan || tenant.plan;
      const dmLimit = plan?.dmLimitMonthly || tenant.dmQuotaMonthly;
      const dmSent = tenant.dmSentThisMonth;

      if (dmSent >= dmLimit) {
        console.log(`⛔ Monthly DM quota exceeded (${dmSent}/${dmLimit}). Upgrade plan for more DMs.`);
        await prisma.messageLog.create({
          data: {
            tenantId,
            igBusinessId: igAccount.igBusinessId,
            mediaId: event.mediaId,
            commentId: event.commentId,
            senderId: event.senderId,
            status: "SKIPPED",
            errorCode: "QUOTA_EXCEEDED"
          }
        });
        return;
      }
    }

    // 3) Load all enabled automations for this media
    console.log("🔍 Searching automations for:", {
      tenantId,
      igAccountId: igAccount.id,
      mediaId: event.mediaId
    });
    
    const automations = await prisma.automation.findMany({
      where: {
        tenantId,
        isEnabled: true,
        isDeleted: false,
        igAccountId: igAccount.id,
        OR: [
          { scopeType: "ALL_POSTS" },
          { scopeType: "POST", scopeMediaId: event.mediaId }
        ]
      },
      orderBy: { priority: "asc" }
    });

    console.log("📋 Found automations:", automations.map(a => ({
      id: a.id,
      flowName: a.flowName,
      scopeType: a.scopeType,
      scopeMediaId: a.scopeMediaId,
      matchType: a.matchType,
      triggerKeyword: a.triggerKeyword,
      isEnabled: a.isEnabled
    })));

    if (automations.length === 0) {
      console.log("ℹ️ No active automations for this media");
      return;
    }

    console.log(`📋 Found ${automations.length} automations to check`);

    // 4) Find matching automation
    for (const automation of automations) {
      // Check timing window
      if (!isWithinTimingWindow(automation)) {
        console.log(`⏰ Automation ${automation.flowName || automation.id} outside timing window`);
        continue;
      }

      // Check match
      const matches = await doesAutomationMatch(automation, event);
      if (!matches) continue;

      console.log(`✅ Automation matched: ${automation.flowName || automation.id}`);

      // Check cooldown per user
      // const isCooldown = await isInCooldown(automation, tenantId, senderId);
      // if (isCooldown) {
      //   console.log(`⏳ User ${senderId} in cooldown for this automation`);
      //   continue;
      // }

      // Add random delay to avoid spam detection
      console.log("⏱️ Adding random delay for anti-spam...");
      await randomDelay();

      // TRIGGER AUTOMATION
      await triggerAutomation(automation, igAccount, event, senderId, tenantId);

      // Log successful execution
      await prisma.messageLog.create({
        data: {
          tenantId,
          igBusinessId: igAccount.igBusinessId,
          mediaId: event.mediaId,
          commentId: event.commentId,
          senderId: senderId,
          senderUsername: event.username || null,
          commentText: event.text || null,
          matchedRuleId: automation.id,
          status: "SENT"
        }
      });

      // Stop after first match
      return;
    }

    console.log("ℹ️ No automation matched this comment");
  },
  { connection: { host: "localhost", port: 6379 } }
);

async function doesAutomationMatch(automation: any, event: any): Promise<boolean> {
  const text = (event.text || "").toLowerCase().trim();

  switch (automation.matchType) {
    case "CONTAINS":
      if (!automation.triggerKeyword) return false;
      return text.includes(automation.triggerKeyword.toLowerCase());

    case "EXACT":
      if (!automation.triggerKeyword) return false;
      return text === automation.triggerKeyword.toLowerCase();

    case "REGEX":
      if (!automation.triggerKeyword) return false;
      try {
        const regex = new RegExp(automation.triggerKeyword, "i");
        return regex.test(text);
      } catch {
        return false;
      }

    case "INTENT":
      const intent = await detectIntent(text);
      return intent === automation.intentLabel;

    case "ALL":
      return true; // Match every comment

    default:
      return false;
  }
}

async function isInCooldown(automation: any, tenantId: string, senderId: string): Promise<boolean> {
  const cooldownSec = automation.cooldownSec || 3600; // Default 1 hour
  
  const lastExec = await prisma.messageLog.findFirst({
    where: { 
      matchedRuleId: automation.id, 
      senderId,
      status: "SENT"
    },
    orderBy: { createdAt: "desc" }
  });

  if (!lastExec) return false;

  const elapsed = (Date.now() - lastExec.createdAt.getTime()) / 1000;
  return elapsed < cooldownSec;
}

async function triggerAutomation(automation: any, igAccount: any, event: any, senderId: string, tenantId: string) {
  const token = decryptToken(igAccount);

  // 1) Send public reply first (if enabled)
  if (automation.enablePublicReply && automation.publicReplyText) {
    try {
      console.log("💬 Sending public reply...");
      await axios.post(
        `https://graph.instagram.com/v24.0/${event.commentId}/replies`,
        {
          message: automation.publicReplyText,
          access_token: token
        }
      );
      console.log("✅ Public reply sent");
    } catch (err: any) {
      console.error("❌ Public reply failed:", err.response?.data || err.message);
    }
  }

  // console.log("igAccount", igAccount);

  // 2) Add small delay between public reply and DM
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 3) Send private DM
  if (automation.privateReplyText) {
    try {
      console.log("📩 Sending DM to:", senderId, igAccount.igUserId);
      await axios.post(
        `https://graph.instagram.com/v24.0/${igAccount.igUserId}/messages`,
        {
          recipient: { comment_id: event.commentId },
          message: { text: automation.privateReplyText },
          access_token: token
        }
      );
      console.log("✅ DM sent successfully");

      // Increment DM count after successful send
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          dmSentThisMonth: { increment: 1 },
          dmSentLifetime: { increment: 1 },
        },
      });
      console.log("📊 DM count incremented for tenant:", tenantId);
    } catch (err: any) {
      console.error("❌ DM failed:", err.response?.data || err.message);
      throw err; // Re-throw to mark as failed
    }
  }
}

async function detectIntent(text: string): Promise<string> {
  // TODO: Integrate with LLM or intent classifier
  // For now, simple keyword detection
  if (text.includes("price") || text.includes("cost") || text.includes("how much")) {
    return "pricing";
  }
  if (text.includes("help") || text.includes("support")) {
    return "support";
  }
  if (text.includes("info") || text.includes("details") || text.includes("learn")) {
    return "info";
  }
  return "general";
}

commentWorker.on("completed", job => {
  console.log(`✅ Job ${job.id} completed`);
});

commentWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

export default commentWorker;
