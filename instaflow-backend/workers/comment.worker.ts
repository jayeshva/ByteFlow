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

    // Check if this is a follow confirm event (user clicked "I Followed" button)
    if (event.isFollowConfirm) {
      console.log("📥 Processing follow confirm event:", {
        automationId: event.automationId,
        senderId: event.senderId
      });

      // Find the automation
      const automation = await prisma.automation.findUnique({
        where: { id: event.automationId }
      });

      if (!automation) {
        console.log("⚠️ Automation not found:", event.automationId);
        return;
      }

      // Find the IG account
      const igAccount = await prisma.iGAccount.findFirst({
        where: { id: automation.igAccountId, isActive: true }
      });

      if (!igAccount) {
        console.log("⚠️ IG account not found for automation");
        return;
      }

      // Trigger automation without requireFollow check (user already confirmed)
      console.log("✅ User confirmed follow. Sending value message...");
      await triggerAutomationForFollowConfirm(automation, igAccount, event.senderId, automation.tenantId);

      // Update log status
      await prisma.messageLog.updateMany({
        where: {
          senderId: event.senderId,
          matchedRuleId: event.automationId,
          status: "PENDING_FOLLOW"
        },
        data: { status: "SENT" }
      });

      return;
    }

    // --- Regular comment event processing ---

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

      // Increment execution count for analytics
      await prisma.automation.update({
        where: { id: automation.id },
        data: { executionCount: { increment: 1 } }
      });
      console.log("📈 Execution count incremented for automation:", automation.flowName || automation.id);

      // Stop after first match
      return;

    }

    console.log("ℹ️ No automation matched this comment");
  },
  { connection: { host: "localhost", port: 6379 } }
);

async function doesAutomationMatch(automation: any, event: any): Promise<boolean> {
  const text = (event.text || "").toLowerCase().trim();

  // Helper: Get keywords as array (supports both new triggerKeywords array and legacy triggerKeyword string)
  const getKeywords = (): string[] => {
    // Check new triggerKeywords array first
    if (automation.triggerKeywords && Array.isArray(automation.triggerKeywords) && automation.triggerKeywords.length > 0) {
      return automation.triggerKeywords.map((k: string) => k.toLowerCase());
    }
    // Fall back to legacy triggerKeyword (comma-separated string)
    if (automation.triggerKeyword) {
      return automation.triggerKeyword.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
    }
    return [];
  };

  switch (automation.matchType) {
    case "CONTAINS": {
      const keywords = getKeywords();
      if (keywords.length === 0) return false;
      // Match if ANY keyword is contained in the text
      return keywords.some(keyword => text.includes(keyword));
    }

    case "EXACT": {
      const keywords = getKeywords();
      if (keywords.length === 0) return false;
      // Match if text EXACTLY matches ANY keyword
      return keywords.some(keyword => text === keyword);
    }

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

  // Require Follow feature - Trust-based (no API verification)
  // User clicks "I Followed" button to proceed, we trust their click
  if (automation.requireFollow) {
    console.log(`👤 Require Follow enabled. Sending follow prompt to ${senderId}...`);

    const promptText = automation.followPromptText || "Follow us to receive exclusive content! 🎁";

    try {
      // Use Button Template with postback button
      await axios.post(
        `https://graph.instagram.com/v24.0/${igAccount.igUserId}/messages`,
        {
          recipient: { comment_id: event.commentId },
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "button",
                text: promptText,
                buttons: [
                  {
                    type: "postback",
                    title: "✅ I Followed!",
                    payload: `FOLLOW_CHECK:${automation.id}`
                  }
                ]
              }
            }
          },
          access_token: token
        }
      );

      console.log("automation_public_reply", automation.enablePublicReply);

      // send public reply if enabled
      if (automation.enablePublicReply) {
        let replyText = automation.publicReplyText;

        // Choose randomly from multiple replies if available
        if (automation.publicReplies && Array.isArray(automation.publicReplies) && automation.publicReplies.length > 0) {
          const replies = automation.publicReplies;
          const randomIndex = Math.floor(Math.random() * replies.length);
          replyText = replies[randomIndex];
        }

        if (replyText) {
          try {
            console.log(`💬 Sending public reply: "${replyText}"`);
            await axios.post(
              `https://graph.instagram.com/v24.0/${event.commentId}/replies`,
              {
                message: replyText,
                access_token: token
              }
            );
            console.log("✅ Public reply sent");
          } catch (err: any) {
            console.error("❌ Public reply failed:", err.response?.data || err.message);
          }
        }
      }
      console.log("✅ Follow prompt sent with Button Template");

      // Log as pending follow
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
          status: "PENDING_FOLLOW",
          errorCode: null
        }
      });
    } catch (err: any) {
      console.error("❌ Follow prompt failed:", err.response?.data || err.message);
    }

    return; // Don't send value message yet - wait for button click
  }


  // 1) Send public reply first (if enabled)
  if (automation.enablePublicReply) {
    let replyText = automation.publicReplyText;

    // Choose randomly from multiple replies if available
    if (automation.publicReplies && Array.isArray(automation.publicReplies) && automation.publicReplies.length > 0) {
      const replies = automation.publicReplies;
      const randomIndex = Math.floor(Math.random() * replies.length);
      replyText = replies[randomIndex];
    }

    if (replyText) {
      try {
        console.log(`💬 Sending public reply: "${replyText}"`);
        await axios.post(
          `https://graph.instagram.com/v24.0/${event.commentId}/replies`,
          {
            message: replyText,
            access_token: token
          }
        );
        console.log("✅ Public reply sent");
      } catch (err: any) {
        console.error("❌ Public reply failed:", err.response?.data || err.message);
      }
    }
  }


  // console.log("igAccount", igAccount);

  // 2) Add small delay between public reply and DM
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 3) Send private DM
  if (automation.privateReplyText) {
    try {
      console.log("📩 Sending DM to:", senderId, igAccount.igUserId);

      // Check if we have CTA buttons to include
      const validButtons = (automation.ctaButtons || [])
        .filter((btn: any) => btn.label && btn.url)
        .slice(0, 3); // Instagram limit: 3 buttons per template

      if (validButtons.length > 0) {
        // Use Button Template: text + clickable buttons in one message
        // Button Template supports up to 640 characters for text
        const buttonTemplatePayload = {
          recipient: { comment_id: event.commentId },
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "button",
                text: automation.privateReplyText, // 640 char limit
                buttons: validButtons.map((btn: any) => ({
                  type: "web_url",
                  url: btn.url,
                  title: btn.label.substring(0, 20) // 20 char limit for button title
                }))
              }
            }
          },
          access_token: token
        };

        try {
          await axios.post(
            `https://graph.instagram.com/v24.0/${igAccount.igUserId}/messages`,
            buttonTemplatePayload
          );
          console.log("✅ DM sent with clickable buttons (Button Template)");
        } catch (templateErr: any) {
          // Fallback: send text with buttons appended as links
          console.log("⚠️ Button template failed, falling back to text links:", templateErr.response?.data?.error?.message || templateErr.message);

          const ctaSection = validButtons
            .map((btn: any) => `🔗 ${btn.label}\n${btn.url}`)
            .join('\n\n');

          const fullMessage = `${automation.privateReplyText}\n\n━━━━━━━━━━━━━━\n${ctaSection}`;

          await axios.post(
            `https://graph.instagram.com/v24.0/${igAccount.igUserId}/messages`,
            {
              recipient: { comment_id: event.commentId },
              message: { text: fullMessage },
              access_token: token
            }
          );
          console.log("✅ Fallback DM sent with text links");
        }
      } else {
        // No buttons - send plain text message
        await axios.post(
          `https://graph.instagram.com/v24.0/${igAccount.igUserId}/messages`,
          {
            recipient: { comment_id: event.commentId },
            message: { text: automation.privateReplyText },
            access_token: token
          }
        );
        console.log("✅ Text DM sent successfully");
      }

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







// Trigger automation for follow confirm (sends value message directly to user)
async function triggerAutomationForFollowConfirm(automation: any, igAccount: any, senderId: string, tenantId: string) {
  const token = decryptToken(igAccount);

  // Add random delay for anti-spam
  console.log("⏱️ Adding random delay for anti-spam...");
  await randomDelay();

  // Send private DM with CTA buttons
  if (automation.privateReplyText) {
    try {
      console.log("📩 Sending value message to:", senderId);

      // Check if we have CTA buttons to include
      const validButtons = (automation.ctaButtons || [])
        .filter((btn: any) => btn.label && btn.url)
        .slice(0, 3);

      if (validButtons.length > 0) {
        // Use Button Template: text + clickable buttons
        const buttonTemplatePayload = {
          recipient: { id: senderId }, // Use recipient.id for follow confirm (not comment_id)
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "button",
                text: automation.privateReplyText,
                buttons: validButtons.map((btn: any) => ({
                  type: "web_url",
                  url: btn.url,
                  title: btn.label.substring(0, 20)
                }))
              }
            }
          },
          access_token: token
        };

        try {
          await axios.post(
            `https://graph.instagram.com/v24.0/${igAccount.igUserId}/messages`,
            buttonTemplatePayload
          );
          console.log("✅ Value message sent with clickable buttons (Button Template)");
        } catch (templateErr: any) {
          // Fallback: send text with buttons as links
          console.log("⚠️ Button template failed, falling back to text links:", templateErr.response?.data?.error?.message || templateErr.message);

          const ctaSection = validButtons
            .map((btn: any) => `🔗 ${btn.label}\n${btn.url}`)
            .join('\n\n');

          const fullMessage = `${automation.privateReplyText}\n\n━━━━━━━━━━━━━━\n${ctaSection}`;

          await axios.post(
            `https://graph.instagram.com/v24.0/${igAccount.igUserId}/messages`,
            {
              recipient: { id: senderId },
              message: { text: fullMessage },
              access_token: token
            }
          );
          console.log("✅ Fallback value message sent with text links");
        }
      } else {
        // No buttons - send plain text message
        await axios.post(
          `https://graph.instagram.com/v24.0/${igAccount.igUserId}/messages`,
          {
            recipient: { id: senderId },
            message: { text: automation.privateReplyText },
            access_token: token
          }
        );
        console.log("✅ Value message sent successfully");
      }

      // Increment DM count
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          dmSentThisMonth: { increment: 1 },
          dmSentLifetime: { increment: 1 },
        },
      });
      console.log("📊 DM count incremented for tenant:", tenantId);

      // Increment execution count
      await prisma.automation.update({
        where: { id: automation.id },
        data: { executionCount: { increment: 1 } }
      });
      console.log("📈 Execution count incremented for automation:", automation.flowName || automation.id);

    } catch (err: any) {
      console.error("❌ Value message failed:", err.response?.data || err.message);
      throw err;
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
