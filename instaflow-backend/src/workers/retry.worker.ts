import { Worker } from "bullmq";
import { config } from "../config";
import { prisma } from "../prisma";
import { dmRateLimiter } from "../utils/meta-rate-limit.util";
import { OutflowSmoothingController } from "../utils/outflow-smoothing.util";
import { decryptToken } from "../utils/crypto.util";
import axios from "axios";
import { UrlUtil } from "../utils/url.util";
import logger from "../utils/logger";

/**
 * retryWorker
 * 
 * Processes jobs from 'retry_events'.
 * Handles rate-limited overflow from both BullMQ and Pub/Sub workers.
 */
const retryWorker = new Worker(
    "retry_events",
    async job => {
        const event = job.data;
        console.log(`🔄 Processing retried job ${job.id} for tenant ${event.tenantId}`);

        // Find IG account
        const igAccount = await prisma.iGAccount.findUnique({
            where: { igUserId: event.tenantId }
        });

        if (!igAccount) {
            console.log('⚠️ No IG account found for retry job');
            return;
        }

        const tenantId = igAccount.tenantId;

        // Check rate limit again before processing
        if (!(await dmRateLimiter.canMakeCall(igAccount.id))) {
            const waitTime = await dmRateLimiter.getWaitTime(igAccount.id);
            console.log(`⏳ Still rate limited. Delaying retry for another ${Math.ceil(waitTime / 60000)}m`);
            await job.moveToDelayed(Date.now() + waitTime);
            return;
        }

        // Outflow Smoothing
        const smoothingWait = await OutflowSmoothingController.acquireSlot(igAccount.id);
        if (smoothingWait > 0) {
            console.log(`⏳ Smoothing: Delaying ${smoothingWait}ms`);
            await job.moveToDelayed(Date.now() + smoothingWait);
            return;
        }

        // Find matching automations
        const automations = await prisma.automation.findMany({
            where: {
                tenantId,
                igAccountId: igAccount.id,
                isEnabled: true,
                OR: [
                    { scopeType: 'ALL_POSTS' },
                    { scopeType: 'POST', scopeMediaId: event.mediaId }
                ]
            }
        });

        if (automations.length === 0) {
            console.log('ℹ️ No active automations for retry');
            return;
        }

        const senderId = event.senderId || event.username;

        // Process each automation
        for (const automation of automations) {
            const matched = checkKeywordMatch(automation, event.text || '');
            if (matched) {
                console.log('✅ Automation matched on retry:', automation.flowName);
                await triggerAutomation(automation, igAccount, event, senderId, tenantId);

                // Update log status from QUEUED_FOR_RETRY to SENT
                await prisma.messageLog.updateMany({
                    where: { commentId: event.commentId, status: 'QUEUED_FOR_RETRY' },
                    data: { status: 'SENT' }
                });

                // Record the call for rate limiting
                await dmRateLimiter.recordCall(igAccount.id);

                // Increment execution count
                await prisma.automation.update({
                    where: { id: automation.id },
                    data: { executionCount: { increment: 1 } }
                });

                console.log(`✅ Retry successful for comment ${event.commentId}`);
                break;
            }
        }
    },
    { connection: { host: config.REDIS_HOST, port: config.REDIS_PORT }, concurrency: 5 }
);

function checkKeywordMatch(automation: any, commentText: string): boolean {
    if (automation.matchType === 'ALL' || automation.matchType === 'ALL_POSTS') return true;

    const keywords = (automation.triggerKeyword || '')
        .split(',')
        .map((k: string) => k.trim().toLowerCase())
        .filter((k: string) => k.length > 0);

    if (keywords.length === 0) return false;

    const lowerText = commentText.toLowerCase();

    if (automation.matchType === 'EXACT') {
        return keywords.some((kw: string) => lowerText === kw);
    }

    return keywords.some((kw: string) => lowerText.includes(kw));
}

async function triggerAutomation(automation: any, igAccount: any, event: any, senderId: string, tenantId: string) {
    const token = decryptToken(igAccount);

    // Send public reply
    if (automation.enablePublicReply && automation.publicReplyText) {
        try {
            await axios.post(
                `https://graph.instagram.com/v24.0/${event.commentId}/replies`,
                { message: automation.publicReplyText, access_token: token }
            );
            console.log('✅ Public reply sent');
        } catch (err: any) {
            console.error('❌ Public reply failed:', err.response?.data || err.message);
        }
    }

    // Send DM
    if (automation.privateReplyText) {
        console.log('📩 Sending DM to:', senderId);

        const validButtons = (automation.ctaButtons || [])
            .filter((btn: any) => btn.label && btn.url)
            .slice(0, 3);

        const recipient = event.commentId ? { comment_id: event.commentId } : { id: senderId };

        try {
            if (validButtons.length > 0) {
                await axios.post(
                    `https://graph.instagram.com/v24.0/${igAccount.igUserId}/messages`,
                    {
                        recipient,
                        message: {
                            attachment: {
                                type: 'template',
                                payload: {
                                    template_type: 'button',
                                    text: automation.privateReplyText,
                                    buttons: validButtons.map((btn: any) => ({
                                        type: 'web_url',
                                        url: UrlUtil.generateTrackingUrl(automation.id, btn.id),
                                        title: btn.label.substring(0, 20)
                                    }))
                                }
                            }
                        },
                        access_token: token
                    }
                );
                console.log('✅ DM sent with buttons');
            } else {
                await axios.post(
                    `https://graph.instagram.com/v24.0/${igAccount.igUserId}/messages`,
                    {
                        recipient,
                        message: { text: automation.privateReplyText },
                        access_token: token
                    }
                );
                console.log('✅ DM sent');
            }

            // Increment DM count
            await prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    dmSentThisMonth: { increment: 1 },
                    dmSentLifetime: { increment: 1 }
                }
            });
        } catch (err: any) {
            console.error('❌ DM failed:', err.response?.data || err.message);
            throw err;
        }
    }
}

retryWorker.on("completed", job => {
    console.log(`✅ Retry job ${job.id} completed`);
});

retryWorker.on("failed", (job, err) => {
    console.error(`❌ Retry job ${job?.id} failed:`, err.message);
});

export default retryWorker;
