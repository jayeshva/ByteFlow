import { Request, Response } from 'express';
import MessagingService from '../services/messaging.service';
import logger from '../utils/logger';
import { parseSignedRequest } from '../utils/meta-auth.util';
import prisma from '../prisma';

export class WebhookController {
    static async verify(req: Request, res: Response) {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        const VERIFY_TOKEN = process.env.IG_WEBHOOK_VERIFY_TOKEN;

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            logger.info('Webhook verified');
            return res.status(200).send(challenge);
        }
        res.sendStatus(403);
    }

    static async handleWebhook(req: Request, res: Response) {
        try {
            const { entry } = req.body;
            if (!entry) return res.sendStatus(200);
            logger.info({ entry }, 'Webhook received');

            for (const e of entry) {
                // 1. Handle comment changes
                const changes = e.changes || [];
                for (const change of changes) {
                    if (change.field === 'comments') {
                        const { value } = change;
                        if (value.parent_id) continue; // Skip replies
                        logger.info({ value }, 'Comment received');

                        await MessagingService.publishWebhookEvent({
                            type: 'comment',
                            tenantId: e.id,
                            mediaId: value.media?.id,
                            commentId: value.id,
                            text: value.text,
                            senderId: value.from?.id,
                            username: value.from?.username,
                            timestamp: e.time,
                        });
                    }
                }

                // 2. Handle messaging events (postbacks for "I Followed" button)
                const messaging = e.messaging || [];
                for (const msg of messaging) {
                    if (msg.postback) {
                        const payload = msg.postback.payload;
                        if (payload?.startsWith('FOLLOW_CHECK:')) {
                            await MessagingService.publishWebhookEvent({
                                type: 'follow_confirm',
                                automationId: payload.split(':')[1],
                                senderId: msg.sender?.id,
                                tenantId: e.id,
                                isFollowConfirm: true,
                                timestamp: Date.now(),
                            });
                        }
                    }
                }
            }
            res.sendStatus(200);
        } catch (err) {
            logger.error({ err }, 'Webhook Error');
            res.sendStatus(500);
        }
    }

    static async handleDeauthorization(req: Request, res: Response) {
        try {
            const { signed_request } = req.body;
            if (!signed_request) {
                return res.status(400).send('Missing signed_request');
            }

            const data = parseSignedRequest(signed_request);
            if (!data) {
                return res.status(400).send('Invalid signed_request');
            }

            const igUserId = data.user_id;
            if (!igUserId) {
                return res.status(400).send('Missing user_id in signed_request');
            }

            logger.info({ igUserId }, 'Deauthorization request received');

            // Mark IG account as inactive
            await prisma.iGAccount.updateMany({
                where: { igUserId },
                data: { isActive: false }
            });

            res.sendStatus(200);
        } catch (err) {
            logger.error({ err }, 'Deauthorization Error');
            res.sendStatus(500);
        }
    }

    static async handleDataDeletion(req: Request, res: Response) {
        try {
            const { signed_request } = req.body;
            if (!signed_request) {
                return res.status(400).send('Missing signed_request');
            }

            const data = parseSignedRequest(signed_request);
            if (!data) {
                return res.status(400).send('Invalid signed_request');
            }

            const igUserId = data.user_id;
            if (!igUserId) {
                return res.status(400).send('Missing user_id in signed_request');
            }

            logger.info({ igUserId }, 'Data deletion request received');

            // In our case, we mark the account as inactive. 
            // In a full implementation, you might remove tokens or other data.
            await prisma.iGAccount.updateMany({
                where: { igUserId },
                data: { isActive: false }
            });

            // Return JSON structure as required by Meta
            // confirmation_code should be unique, we use a timestamp-based string for now
            const confirmationCode = `DEL-${Date.now()}-${igUserId}`;

            res.json({
                url: `${process.env.FRONTEND_URL || 'https://instaflow.me'}/data-deletion-status?id=${confirmationCode}`,
                confirmation_code: confirmationCode
            });
        } catch (err) {
            logger.error({ err }, 'Data Deletion Error');
            res.sendStatus(500);
        }
    }
}
