/**
 * Unified Worker
 * 
 * Single worker file compatible with both local (BullMQ) and cloud (Pub/Sub) deployments.
 * Abstracts transport layer while sharing all core business logic.
 */

import { Worker, DelayedError } from "bullmq";
import { prisma } from "../prisma";
import axios from "axios";
import { decryptToken } from "../utils/crypto.util";
import { UrlUtil } from "../utils/url.util";
import { config } from "../config";
import {
    dmRateLimiter,
    isRateLimitError,
    getWaitTime,
} from "../utils/meta-rate-limit.util";
import logger from "../utils/logger";
import { OutflowSmoothingController } from "../utils/outflow-smoothing.util";
import { PubSubService } from "../services/pubsub.service";
import { retryQueue } from "../queues/retry.queue";

// ============================================================================
// CONFIGURATION
// ============================================================================

const RATE_LIMIT_PER_HOUR = 3; // Meta limit: 750 private replies/hour (buffer of 50)
const MIN_DELAY_MS = 3000;
const MAX_DELAY_MS = 8000;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
    return new Promise(resolve => setTimeout(resolve, delay));
}

function isWithinTimingWindow(automation: any): boolean {
    if (!automation.isAutomationTimingEnabled) return true;
    const now = new Date();
    if (automation.automationStartTime && new Date(automation.automationStartTime) > now) return false;
    if (automation.automationEndTime && new Date(automation.automationEndTime) < now) return false;
    return true;
}

// ============================================================================
// COMMON RATE LIMIT CHECK
// ============================================================================

interface RateLimitCheckResult {
    allowed: boolean;
    shouldDelay?: number;
    reason?: 'META_RATE_LIMIT' | 'DB_RATE_LIMIT' | 'QUOTA_EXCEEDED' | 'ALREADY_PROCESSED';
}

/**
 * Check if this comment was already processed (deduplication)
 */
async function wasAlreadyProcessed(commentId: string): Promise<boolean> {
    if (!commentId) return false;

    const existing = await prisma.messageLog.findFirst({
        where: {
            commentId,
            status: "SENT"
        }
    });

    return !!existing;
}

/**
 * Helper: Create or update log entry for a comment
 * Avoids duplicate entries by checking if one exists first
 */
async function upsertCommentLog(
    commentId: string,
    data: {
        tenantId: string;
        igBusinessId: string;
        mediaId: string;
        senderId: string;
        status: string;
        errorCode: string;
    }
): Promise<void> {
    const existing = await prisma.messageLog.findFirst({
        where: { commentId }
    });

    if (existing) {
        await prisma.messageLog.update({
            where: { id: existing.id },
            data: { status: data.status, errorCode: data.errorCode }
        });
    } else {
        await prisma.messageLog.create({
            data: {
                tenantId: data.tenantId,
                igBusinessId: data.igBusinessId,
                mediaId: data.mediaId,
                commentId,
                senderId: data.senderId,
                status: data.status,
                errorCode: data.errorCode
            }
        });
    }
}

/**
 * Common rate limit and quota check for all DM sending flows.
 * Call this before sending any DM (comment flow, follow confirmation, etc.)
 * 
 * @param igAccount The IG account sending the DM
 * @param tenantId The tenant ID
 * @param logData Optional data for logging if rate limited
 */
async function checkRateLimitsAndQuota(
    igAccount: { id: string; igBusinessId: string },
    tenantId: string,
    logData?: { mediaId?: string; commentId?: string; senderId?: string }
): Promise<RateLimitCheckResult> {

    // 1) Check Redis-based Meta rate limiter (sliding window)
    if (!(await dmRateLimiter.canMakeCall(igAccount.id))) {
        const waitTime = await dmRateLimiter.getWaitTime(igAccount.id);
        const minutes = Math.ceil(waitTime / 60000);

        logger.warn({ accountId: igAccount.id, waitTimeMs: waitTime }, 'Meta rate limit reached for account');
        console.log(`⛔ Meta rate limit reached. Delaying job for ${minutes} minutes.`);

        if (logData?.commentId) {
            await upsertCommentLog(logData.commentId, {
                tenantId,
                igBusinessId: igAccount.igBusinessId,
                mediaId: logData.mediaId || '',
                senderId: logData.senderId || '',
                status: "QUEUED_FOR_RETRY",
                errorCode: "META_RATE_LIMIT"
            });
        }

        return { allowed: false, shouldDelay: waitTime, reason: 'META_RATE_LIMIT' };
    }

    // 2) Outflow Smoothing: Mimic human behavior by spacing out DMs (waits inline)
    await OutflowSmoothingController.waitAndAcquire(igAccount.id);

    // 3) Backup DB-based rate limit check
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentDMs = await prisma.messageLog.count({
        where: {
            tenantId,
            status: "SENT",
            createdAt: { gte: oneHourAgo }
        }
    });

    if (recentDMs >= RATE_LIMIT_PER_HOUR) {
        // Get actual wait time from Redis for accurate delay
        const waitTime = await dmRateLimiter.getWaitTime(igAccount.id);
        const delayMs = waitTime > 0 ? waitTime : 600000; // Fallback to 10 min if Redis has no data
        const minutes = Math.ceil(delayMs / 60000);

        console.log(`⛔ DB Rate limit reached. Delaying job for ${minutes} minutes.`);

        if (logData?.commentId) {
            await upsertCommentLog(logData.commentId, {
                tenantId,
                igBusinessId: igAccount.igBusinessId,
                mediaId: logData.mediaId || '',
                senderId: logData.senderId || '',
                status: "QUEUED_FOR_RETRY",
                errorCode: "DB_RATE_LIMIT"
            });
        }

        return { allowed: false, shouldDelay: delayMs, reason: 'DB_RATE_LIMIT' };
    }

    // 4) Check subscription quota (monthly DM limit based on plan)
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

            if (logData?.commentId) {
                await upsertCommentLog(logData.commentId, {
                    tenantId,
                    igBusinessId: igAccount.igBusinessId,
                    mediaId: logData.mediaId || '',
                    senderId: logData.senderId || '',
                    status: "SKIPPED",
                    errorCode: "QUOTA_EXCEEDED"
                });
            }

            return { allowed: false, reason: 'QUOTA_EXCEEDED' };
        }
    }

    return { allowed: true };
}

// ============================================================================
// CORE EVENT PROCESSOR
// ============================================================================

interface ProcessResult {
    success: boolean;
    shouldDelay?: number; // If set, delay job by this many ms
}

/**
 * Main event processor - shared logic for both BullMQ and Pub/Sub
 */
export async function processEvent(event: any): Promise<ProcessResult> {
    // Handle follow confirmation events
    if (event.isFollowConfirm) {
        return processFollowConfirm(event);
    }

    // Regular comment event processing
    return processCommentEvent(event);
}

async function processFollowConfirm(event: any): Promise<ProcessResult> {
    const { automationId, senderId } = event;

    console.log("📥 Processing follow confirm event:", { automationId, senderId });

    if (!automationId || !senderId) {
        console.log("⚠️ Missing automationId or senderId");
        return { success: true };
    }

    const automation = await prisma.automation.findUnique({
        where: { id: automationId }
    });

    if (!automation) {
        console.log("⚠️ Automation not found:", automationId);
        return { success: true };
    }

    const igAccount = await prisma.iGAccount.findFirst({
        where: { id: automation.igAccountId, isActive: true }
    });

    if (!igAccount) {
        console.log("⚠️ IG account not found for automation");
        return { success: true };
    }

    // Check rate limits and quota (common function)
    const rateLimitCheck = await checkRateLimitsAndQuota(
        igAccount,
        automation.tenantId,
        { senderId }
    );

    if (!rateLimitCheck.allowed) {
        if (rateLimitCheck.shouldDelay) {
            return { success: false, shouldDelay: rateLimitCheck.shouldDelay };
        }
        return { success: true }; // Quota exceeded - skip silently
    }

    console.log("✅ User confirmed follow. Sending value message...");

    // Add random delay for anti-spam
    console.log("⏱️ Adding random delay for anti-spam...");
    await randomDelay();

    await triggerAutomationForFollowConfirm(automation, igAccount, senderId, automation.tenantId);

    // Update log status
    await prisma.messageLog.updateMany({
        where: {
            senderId: senderId,
            matchedRuleId: automationId,
            status: "PENDING_FOLLOW"
        },
        data: { status: "SENT" }
    });

    return { success: true };
}

async function processCommentEvent(event: any): Promise<ProcessResult> {
    const senderId = event.senderId || event.from?.id || event.username;

    console.log("📥 Processing comment event:", {
        mediaId: event.mediaId,
        text: event.text?.substring(0, 50),
        username: event.username,
        senderId,
        commentId: event.commentId
    });

    // 0) DEDUPLICATION: Skip if already processed
    if (event.commentId && await wasAlreadyProcessed(event.commentId)) {
        console.log("⏭️ Comment already processed, skipping:", event.commentId);
        return { success: true };
    }

    // 1) Find tenant via IG Business ID
    const igAccount = await prisma.iGAccount.findUnique({
        where: { igUserId: event.tenantId }
    });

    if (!igAccount) {
        console.log("⚠️ No IG account matches this tenant");
        return { success: true };
    }

    const tenantId = igAccount.tenantId;

    // 2) Load all enabled automations for this media FIRST (before rate limit check)
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
        return { success: true };
    }

    console.log(`📋 Found ${automations.length} automations to check`);

    // 3) Find matching automation FIRST (before rate limit check)
    let matchedAutomation = null;
    for (const automation of automations) {
        // Check timing window
        if (!isWithinTimingWindow(automation)) {
            console.log(`⏰ Automation ${automation.flowName || automation.id} outside timing window`);
            continue;
        }

        // Check match
        const matches = await doesAutomationMatch(automation, event);
        if (matches) {
            matchedAutomation = automation;
            break;
        }
    }

    if (!matchedAutomation) {
        console.log("ℹ️ No automation matched this comment");
        return { success: true };
    }

    console.log(`✅ Automation matched: ${matchedAutomation.flowName || matchedAutomation.id}`);

    // 4) NOW check rate limits (only when we actually have a DM to send)
    const rateLimitCheck = await checkRateLimitsAndQuota(
        igAccount,
        tenantId,
        { mediaId: event.mediaId, commentId: event.commentId, senderId }
    );

    if (!rateLimitCheck.allowed) {
        if (rateLimitCheck.shouldDelay) {
            return { success: false, shouldDelay: rateLimitCheck.shouldDelay };
        }
        return { success: true }; // Quota exceeded - skip silently
    }

    // 5) Add random delay to avoid spam detection
    console.log("⏱️ Adding random delay for anti-spam...");
    await randomDelay();

    // 6) TRIGGER AUTOMATION
    await triggerAutomation(matchedAutomation, igAccount, event, senderId, tenantId);

    // Log successful execution
    await prisma.messageLog.create({
        data: {
            tenantId,
            igBusinessId: igAccount.igBusinessId,
            mediaId: event.mediaId || '',
            commentId: event.commentId || '',
            senderId: senderId,
            senderUsername: event.username || null,
            commentText: event.text || null,
            matchedRuleId: matchedAutomation.id,
            status: "SENT"
        }
    });

    // Increment execution count for analytics
    await prisma.automation.update({
        where: { id: matchedAutomation.id },
        data: { executionCount: { increment: 1 } }
    });
    console.log("📈 Execution count incremented for automation:", matchedAutomation.flowName || matchedAutomation.id);

    return { success: true };
}

// ============================================================================
// AUTOMATION MATCHING
// ============================================================================

async function doesAutomationMatch(automation: any, event: any): Promise<boolean> {
    const text = (event.text || "").toLowerCase().trim();

    // Helper: Get keywords as array (supports both new triggerKeywords array and legacy triggerKeyword string)
    const getKeywords = (): string[] => {
        if (automation.triggerKeywords && Array.isArray(automation.triggerKeywords) && automation.triggerKeywords.length > 0) {
            return automation.triggerKeywords.map((k: string) => k.toLowerCase());
        }
        if (automation.triggerKeyword) {
            return automation.triggerKeyword.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
        }
        return [];
    };

    switch (automation.matchType) {
        case "CONTAINS": {
            const keywords = getKeywords();
            if (keywords.length === 0) return false;
            return keywords.some(keyword => text.includes(keyword));
        }

        case "EXACT": {
            const keywords = getKeywords();
            if (keywords.length === 0) return false;
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
            return true;

        default:
            return false;
    }
}

async function detectIntent(text: string): Promise<string> {
    // TODO: Integrate with LLM or intent classifier
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

// ============================================================================
// AUTOMATION TRIGGERS
// ============================================================================

async function triggerAutomation(automation: any, igAccount: any, event: any, senderId: string, tenantId: string) {
    const token = decryptToken(igAccount);

    // Require Follow feature
    if (automation.requireFollow) {
        console.log(`👤 Require Follow enabled. Sending follow prompt to ${senderId}...`);
        await sendFollowPrompt(automation, igAccount, event, token, tenantId);
        return;
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

    // 2) Add small delay between public reply and DM
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 3) Send private DM
    await sendValueMessage(automation, igAccount, senderId, tenantId, event.commentId, token);
}

async function sendFollowPrompt(automation: any, igAccount: any, event: any, token: string, tenantId: string) {
    const promptText = automation.followPromptText || "Follow us to receive exclusive content! 🎁";

    try {
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
                            buttons: [{
                                type: "postback",
                                title: "✅ I Followed!",
                                payload: `FOLLOW_CHECK:${automation.id}`
                            }]
                        }
                    }
                },
                access_token: token
            }
        );

        // Send public reply if enabled (for follow prompt flow)
        if (automation.enablePublicReply) {
            let replyText = automation.publicReplyText;
            if (automation.publicReplies && Array.isArray(automation.publicReplies) && automation.publicReplies.length > 0) {
                const randomIndex = Math.floor(Math.random() * automation.publicReplies.length);
                replyText = automation.publicReplies[randomIndex];
            }
            if (replyText) {
                try {
                    console.log(`💬 Sending public reply: "${replyText}"`);
                    await axios.post(
                        `https://graph.instagram.com/v24.0/${event.commentId}/replies`,
                        { message: replyText, access_token: token }
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
                mediaId: event.mediaId || '',
                commentId: event.commentId || '',
                senderId: event.senderId || '',
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
}

async function triggerAutomationForFollowConfirm(automation: any, igAccount: any, senderId: string, tenantId: string) {
    const token = decryptToken(igAccount);

    console.log("⏱️ Adding random delay for anti-spam...");
    await randomDelay();

    await sendValueMessage(automation, igAccount, senderId, tenantId, undefined, token);

    // Increment execution count
    await prisma.automation.update({
        where: { id: automation.id },
        data: { executionCount: { increment: 1 } }
    });
    console.log("📈 Execution count incremented for automation:", automation.flowName || automation.id);
}

async function sendValueMessage(
    automation: any,
    igAccount: any,
    senderId: string,
    tenantId: string,
    commentId?: string,
    token?: string
) {
    const accessToken = token || decryptToken(igAccount);

    if (!automation.privateReplyText) return;

    console.log("📩 Sending DM to:", senderId);

    const validButtons = (automation.ctaButtons || [])
        .filter((btn: any) => btn.label && btn.url)
        .slice(0, 3);

    const recipient = commentId ? { comment_id: commentId } : { id: senderId };

    try {
        if (validButtons.length > 0) {
            const buttonTemplatePayload = {
                recipient,
                message: {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "button",
                            text: automation.privateReplyText,
                            buttons: validButtons.map((btn: any) => ({
                                type: "web_url",
                                url: UrlUtil.generateTrackingUrl(automation.id, btn.id),
                                title: btn.label.substring(0, 20)
                            }))
                        }
                    }
                },
                access_token: accessToken
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
                        recipient,
                        message: { text: fullMessage },
                        access_token: accessToken
                    }
                );
                console.log("✅ Fallback DM sent with text links");
            }
        } else {
            await axios.post(
                `https://graph.instagram.com/v24.0/${igAccount.igUserId}/messages`,
                {
                    recipient,
                    message: { text: automation.privateReplyText },
                    access_token: accessToken
                }
            );
            console.log("✅ Text DM sent successfully");
        }

        // Record call with rate limiter and increment DM count
        await dmRateLimiter.recordCall(igAccount.id);
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                dmSentThisMonth: { increment: 1 },
                dmSentLifetime: { increment: 1 },
            },
        });
        console.log("📊 DM count incremented for tenant:", tenantId);
    } catch (err: any) {
        if (isRateLimitError(err)) {
            const waitTime = getWaitTime(err);
            logger.error({
                errorCode: err.response?.data?.error?.code,
                waitTimeMinutes: Math.ceil(waitTime / 60000),
                accountId: igAccount.id
            }, 'Meta API rate limit error');
            console.error(`❌ Meta rate limit! Wait ${Math.ceil(waitTime / 60000)} minutes.`);
        } else {
            console.error("❌ DM failed:", err.response?.data || err.message);
        }
        throw err;
    }
}

// ============================================================================
// TRANSPORT ADAPTERS
// ============================================================================

let bullmqWorker: Worker | null = null;

/**
 * Start BullMQ worker for local development
 */
export function startBullMQWorker(): Worker {
    console.log("🔧 Initializing BullMQ worker...");

    bullmqWorker = new Worker(
        "comment_events",
        async job => {
            const result = await processEvent(job.data);

            if (!result.success && result.shouldDelay) {
                // Move job to delayed state
                await job.moveToDelayed(Date.now() + result.shouldDelay);
                // Throw DelayedError to tell BullMQ not to finalize the job
                throw new DelayedError();
            }
        },
        { connection: { host: config.REDIS_HOST, port: config.REDIS_PORT } }
    );

    bullmqWorker.on("completed", job => {
        console.log(`✅ Job ${job.id} completed`);
    });

    bullmqWorker.on("failed", (job, err) => {
        console.error(`❌ Job ${job?.id} failed:`, err.message);
    });

    console.log("✅ BullMQ worker started");
    return bullmqWorker;
}

/**
 * Start Pub/Sub worker for cloud deployment
 */
export async function startPubSubWorker(): Promise<void> {
    console.log("🔧 Initializing Pub/Sub worker...");

    PubSubService.subscribe(async (event: any, ack: () => void) => {
        try {
            console.log(`📥 Processing ${event.type || 'comment'} event via Pub/Sub...`);

            const result = await processEvent(event);

            if (!result.success && result.shouldDelay) {
                // Queue for retry using BullMQ retry queue
                console.log(`⏳ Queuing for retry in ${Math.ceil(result.shouldDelay / 60000)}m`);
                await retryQueue.add('retry', event, { delay: result.shouldDelay });
            }

            // Acknowledge message after processing
            ack();
            console.log('✅ Event processed successfully');
        } catch (error) {
            console.error('❌ Event processing failed:', error);
            throw error; // Don't ack - message will be retried by Pub/Sub
        }
    });

    console.log("✅ Pub/Sub worker started");
}

/**
 * Unified entry point - automatically selects transport based on RUN_MODE
 */
export async function startUnifiedWorker(): Promise<void> {
    const runMode = process.env.RUN_MODE || 'local';

    if (runMode === 'cloud') {
        console.log('☁️ Using GCP Pub/Sub for job processing');
        await startPubSubWorker();
    } else {
        console.log('🏠 Using BullMQ + Redis for job processing');
        startBullMQWorker();
    }
}

export default { startUnifiedWorker, startBullMQWorker, startPubSubWorker, processEvent };
