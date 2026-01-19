/**
 * GCP Cloud Function - Instagram Webhook Receiver
 * 
 * This function receives Instagram webhooks and publishes them to Pub/Sub.
 * It's always available and provides a durable queue for webhook events.
 * 
 * Deploy:
 *   gcloud functions deploy instagram-webhook \
 *     --runtime nodejs20 \
 *     --trigger-http \
 *     --allow-unauthenticated \
 *     --region us-central1 \
 *     --set-env-vars GCP_PROJECT_ID=your-project,PUBSUB_TOPIC=instagram-webhooks
 */

import { PubSub } from '@google-cloud/pubsub';
import { Request, Response } from '@google-cloud/functions-framework';

const PROJECT_ID = process.env.GCP_PROJECT_ID || '';
const TOPIC_NAME = process.env.PUBSUB_TOPIC || 'instagram-webhooks';
const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || 'your-verify-token';

const pubsub = new PubSub({ projectId: PROJECT_ID });

/**
 * Main HTTP handler for Instagram webhooks
 */
export async function instagramWebhook(req: Request, res: Response) {
    try {
        // Handle webhook verification (GET request from Instagram)
        if (req.method === 'GET') {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];

            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('✅ Webhook verified');
                return res.status(200).send(challenge);
            } else {
                console.warn('❌ Webhook verification failed');
                return res.status(403).send('Forbidden');
            }
        }

        // Handle webhook events (POST request)
        if (req.method === 'POST') {
            const body = req.body;
            console.log('📥 Received webhook:', JSON.stringify(body).substring(0, 200));

            if (!body.entry) {
                return res.status(200).send('OK');
            }

            const topic = pubsub.topic(TOPIC_NAME);
            const publishPromises: Promise<string>[] = [];

            for (const entry of body.entry) {
                // Handle comment events
                const changes = entry.changes || [];
                for (const change of changes) {
                    if (change.field === 'comments') {
                        const value = change.value;

                        // Skip replies
                        if (value.parent_id) {
                            console.log('ℹ️ Skipping reply comment');
                            continue;
                        }

                        const event = {
                            type: 'comment',
                            tenantId: entry.id,
                            mediaId: value.media?.id,
                            commentId: value.id,
                            text: value.text,
                            senderId: value.from?.id,
                            username: value.from?.username,
                            timestamp: entry.time,
                        };

                        const data = Buffer.from(JSON.stringify(event));
                        publishPromises.push(topic.publishMessage({ data }));
                        console.log('📤 Publishing comment event');
                    }
                }

                // Handle messaging events (postback button clicks)
                const messaging = entry.messaging || [];
                for (const msg of messaging) {
                    if (msg.postback) {
                        const payload = msg.postback.payload;

                        if (payload?.startsWith('FOLLOW_CHECK:')) {
                            const event = {
                                type: 'follow_confirm',
                                automationId: payload.split(':')[1],
                                senderId: msg.sender?.id,
                                tenantId: entry.id,
                                isFollowConfirm: true,
                                timestamp: Date.now(),
                            };

                            const data = Buffer.from(JSON.stringify(event));
                            publishPromises.push(topic.publishMessage({ data }));
                            console.log('📤 Publishing follow confirm event');
                        }
                    }

                    // Handle quick reply
                    if (msg.message?.quick_reply) {
                        const payload = msg.message.quick_reply.payload;

                        if (payload?.startsWith('FOLLOW_CHECK:')) {
                            const event = {
                                type: 'follow_confirm',
                                automationId: payload.split(':')[1],
                                senderId: msg.sender?.id,
                                tenantId: entry.id,
                                isFollowConfirm: true,
                                timestamp: Date.now(),
                            };

                            const data = Buffer.from(JSON.stringify(event));
                            publishPromises.push(topic.publishMessage({ data }));
                            console.log('📤 Publishing follow confirm event (quick reply)');
                        }
                    }
                }
            }

            // Wait for all publishes
            if (publishPromises.length > 0) {
                const messageIds = await Promise.all(publishPromises);
                console.log(`✅ Published ${messageIds.length} messages`);
            }

            return res.status(200).send('OK');
        }

        return res.status(405).send('Method Not Allowed');
    } catch (error) {
        console.error('❌ Webhook error:', error);
        return res.status(500).send('Internal Server Error');
    }
}
