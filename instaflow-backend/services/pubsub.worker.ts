/**
 * Pub/Sub Worker
 * 
 * Processes messages from GCP Pub/Sub in cloud mode.
 * Mirrors the functionality of comment.worker.ts but uses Pub/Sub instead of BullMQ.
 */

import { prisma } from '../prisma';
import axios from 'axios';
import { decryptToken } from '../utils/decryption.util';
import { PubSubService, WebhookEvent } from './pubsub.service';

// Anti-spam configuration
const RATE_LIMIT_PER_HOUR = 180;
const MIN_DELAY_MS = 3000;
const MAX_DELAY_MS = 8000;

function randomDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
    return new Promise(resolve => setTimeout(resolve, delay));
}

export async function startPubSubWorker() {
    console.log('🚀 Starting Pub/Sub worker...');

    PubSubService.subscribe(async (event, ack) => {
        try {
            console.log(`📥 Processing ${event.type} event...`);

            if (event.isFollowConfirm) {
                await processFollowConfirm(event);
            } else {
                await processCommentEvent(event);
            }

            // Acknowledge message after successful processing
            ack();
            console.log('✅ Event processed successfully');
        } catch (error: any) {
            console.error('❌ Event processing failed:', error);
            // Don't ack - message will be retried
            throw error;
        }
    });
}

async function processFollowConfirm(event: WebhookEvent) {
    const { automationId, senderId } = event;

    if (!automationId || !senderId) {
        console.log('⚠️ Missing automationId or senderId');
        return;
    }

    const automation = await prisma.automation.findUnique({
        where: { id: automationId }
    });

    if (!automation) {
        console.log('⚠️ Automation not found:', automationId);
        return;
    }

    const igAccount = await prisma.iGAccount.findFirst({
        where: { id: automation.igAccountId, isActive: true }
    });

    if (!igAccount) {
        console.log('⚠️ IG account not found');
        return;
    }

    // Send value message
    await sendValueMessage(automation, igAccount, senderId, automation.tenantId);

    // Update log status
    await prisma.messageLog.updateMany({
        where: {
            senderId: senderId,
            matchedRuleId: automationId,
            status: 'PENDING_FOLLOW'
        },
        data: { status: 'SENT' }
    });
}

async function processCommentEvent(event: WebhookEvent) {
    const senderId = event.senderId || event.username;

    console.log('📥 Processing comment:', {
        mediaId: event.mediaId,
        text: event.text?.substring(0, 50),
        senderId
    });

    // Find IG account
    const igAccount = await prisma.iGAccount.findUnique({
        where: { igUserId: event.tenantId }
    });

    if (!igAccount) {
        console.log('⚠️ No IG account matches');
        return;
    }

    const tenantId = igAccount.tenantId;

    // Check rate limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentDMs = await prisma.messageLog.count({
        where: {
            tenantId,
            status: 'SENT',
            createdAt: { gte: oneHourAgo }
        }
    });

    if (recentDMs >= RATE_LIMIT_PER_HOUR) {
        console.log('⛔ Rate limit reached');
        return;
    }

    // Find matching automations
    const automations = await prisma.automation.findMany({
        where: {
            tenantId,
            igAccountId: igAccount.id,
            isEnabled: true,
            OR: [
                { scopeType: 'ALL' },
                { scopeType: 'POST', scopeMediaId: event.mediaId }
            ]
        }
    });

    if (automations.length === 0) {
        console.log('ℹ️ No active automations');
        return;
    }

    // Process each automation
    for (const automation of automations) {
        const matched = checkKeywordMatch(automation, event.text || '');

        if (matched) {
            console.log('✅ Automation matched:', automation.flowName);
            await randomDelay();
            await triggerAutomation(automation, igAccount, event, senderId!, tenantId);
            break;
        }
    }
}

function checkKeywordMatch(automation: any, commentText: string): boolean {
    if (automation.matchType === 'ALL') return true;

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

async function triggerAutomation(automation: any, igAccount: any, event: WebhookEvent, senderId: string, tenantId: string) {
    const token = decryptToken(igAccount);

    // Require follow check
    if (automation.requireFollow) {
        console.log('👤 Sending follow prompt...');
        await sendFollowPrompt(automation, igAccount, event, token);
        return;
    }

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
    await sendValueMessage(automation, igAccount, senderId, tenantId, event.commentId);

    // Increment counts
    await prisma.automation.update({
        where: { id: automation.id },
        data: { executionCount: { increment: 1 } }
    });
}

async function sendFollowPrompt(automation: any, igAccount: any, event: WebhookEvent, token: string) {
    const promptText = automation.followPromptText || 'Follow us to receive exclusive content! 🎁';

    try {
        await axios.post(
            `https://graph.instagram.com/v24.0/${igAccount.igUserId}/messages`,
            {
                recipient: { comment_id: event.commentId },
                message: {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'button',
                            text: promptText,
                            buttons: [{
                                type: 'postback',
                                title: '✅ I Followed!',
                                payload: `FOLLOW_CHECK:${automation.id}`
                            }]
                        }
                    }
                },
                access_token: token
            }
        );
        console.log('✅ Follow prompt sent');

        // Log as pending
        await prisma.messageLog.create({
            data: {
                tenantId: automation.tenantId,
                igBusinessId: igAccount.igBusinessId,
                mediaId: event.mediaId || '',
                commentId: event.commentId || '',
                senderId: event.senderId || '',
                senderUsername: event.username,
                matchedRuleId: automation.id,
                status: 'PENDING_FOLLOW'
            }
        });
    } catch (err: any) {
        console.error('❌ Follow prompt failed:', err.response?.data || err.message);
    }
}

async function sendValueMessage(automation: any, igAccount: any, senderId: string, tenantId: string, commentId?: string) {
    const token = decryptToken(igAccount);

    if (!automation.privateReplyText) return;

    console.log('📩 Sending DM to:', senderId);

    const validButtons = (automation.ctaButtons || [])
        .filter((btn: any) => btn.label && btn.url)
        .slice(0, 3);

    const recipient = commentId ? { comment_id: commentId } : { id: senderId };

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
                                    url: btn.url,
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
