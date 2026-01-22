import { Queue } from 'bullmq';
import { config } from '../config';

export const commentQueue = config.RUN_MODE === 'local'
    ? new Queue('comment_events', {
        connection: {
            host: config.REDIS_HOST,
            port: config.REDIS_PORT,
        },
    })
    : null;
