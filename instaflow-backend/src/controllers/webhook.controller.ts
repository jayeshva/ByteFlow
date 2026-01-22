import { Request, Response } from 'express';
import MessagingService from '../services/messaging.service';
import logger from '../utils/logger';

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

            for (const e of entry) {
                // 1. Handle comment changes
                const changes = e.changes || [];
                for (const change of changes) {
                    if (change.field === 'comments') {
                        const { value } = change;
                        if (value.parent_id) continue; // Skip replies

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
}
