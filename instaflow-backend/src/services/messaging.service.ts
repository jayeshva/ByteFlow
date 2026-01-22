import { config } from '../config';
import { commentQueue } from '../queues/comment.queue';
import { PubSubService } from './pubsub.service';
import logger from '../utils/logger';

/**
 * MessagingService
 * 
 * Abstraction layer for event publishing.
 * Automatically switches between BullMQ (local) and Pub/Sub (cloud) based on RUN_MODE.
 */
export const MessagingService = {
    /**
     * Publish a webhook event
     */
    publishWebhookEvent: async (event: any) => {
        if (config.RUN_MODE === 'local') {
            if (commentQueue) {
                await commentQueue.add('comment_events', event);
                logger.info({ eventType: event.type || 'comment' }, 'Enqueued event to BullMQ');
            } else {
                logger.warn('BullMQ queue not initialized in local mode');
            }
        } else {
            // Cloud mode
            try {
                await PubSubService.publish(event);
                logger.info({ eventType: event.type || 'comment' }, 'Published event to Pub/Sub');
            } catch (err) {
                logger.error({ err }, 'Failed to publish to Pub/Sub');
                throw err;
            }
        }
    }
};

export default MessagingService;
