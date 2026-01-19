/**
 * GCP Pub/Sub Service
 * 
 * Handles publishing and subscribing to Pub/Sub topics for webhook processing.
 * Used in cloud mode to replace BullMQ + Redis.
 */

import { PubSub, Message } from '@google-cloud/pubsub';

const PROJECT_ID = process.env.GCP_PROJECT_ID || '';
const TOPIC_NAME = process.env.PUBSUB_TOPIC || 'instagram-webhooks';
const SUBSCRIPTION_NAME = process.env.PUBSUB_SUBSCRIPTION || 'instagram-webhooks-sub';

// Initialize Pub/Sub client
const pubsub = new PubSub({ projectId: PROJECT_ID });

export interface WebhookEvent {
    type: 'comment' | 'follow_confirm';
    tenantId?: string;
    mediaId?: string;
    commentId?: string;
    text?: string;
    senderId?: string;
    username?: string;
    timestamp?: number;
    automationId?: string;
    isFollowConfirm?: boolean;
}

export const PubSubService = {
    /**
     * Publish a webhook event to the topic
     */
    publish: async (event: WebhookEvent): Promise<string> => {
        const topic = pubsub.topic(TOPIC_NAME);
        const data = Buffer.from(JSON.stringify(event));

        try {
            const messageId = await topic.publishMessage({ data });
            console.log(`📤 Published message ${messageId} to ${TOPIC_NAME}`);
            return messageId;
        } catch (error: any) {
            console.error('❌ Pub/Sub publish error:', error);
            throw error;
        }
    },

    /**
     * Start subscription to process messages
     */
    subscribe: (handler: (event: WebhookEvent, ack: () => void) => Promise<void>): void => {
        const subscription = pubsub.subscription(SUBSCRIPTION_NAME);

        subscription.on('message', async (message: Message) => {
            try {
                const event: WebhookEvent = JSON.parse(message.data.toString());
                console.log(`📥 Received message ${message.id}:`, event.type);

                await handler(event, () => message.ack());
            } catch (error: any) {
                console.error('❌ Message processing error:', error);
                // Nack to retry later
                message.nack();
            }
        });

        subscription.on('error', (error: any) => {
            console.error('❌ Subscription error:', error);
        });

        console.log(`✅ Subscribed to ${SUBSCRIPTION_NAME}`);
    },

    /**
     * Create topic and subscription if they don't exist (for setup)
     */
    setup: async (): Promise<void> => {
        try {
            // Create topic
            const [topics] = await pubsub.getTopics();
            const topicExists = topics.some(t => t.name.endsWith(`/${TOPIC_NAME}`));

            if (!topicExists) {
                await pubsub.createTopic(TOPIC_NAME);
                console.log(`✅ Created topic: ${TOPIC_NAME}`);
            }

            // Create subscription
            const topic = pubsub.topic(TOPIC_NAME);
            const [subscriptions] = await topic.getSubscriptions();
            const subExists = subscriptions.some(s => s.name.endsWith(`/${SUBSCRIPTION_NAME}`));

            if (!subExists) {
                await topic.createSubscription(SUBSCRIPTION_NAME, {
                    ackDeadlineSeconds: 60,
                    retryPolicy: {
                        minimumBackoff: { seconds: 10 },
                        maximumBackoff: { seconds: 600 },
                    },
                });
                console.log(`✅ Created subscription: ${SUBSCRIPTION_NAME}`);
            }
        } catch (error: any) {
            console.error('❌ Pub/Sub setup error:', error);
            throw error;
        }
    },
};

export default PubSubService;
