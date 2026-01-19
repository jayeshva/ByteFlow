import { Queue } from "bullmq";

const RUN_MODE = process.env.RUN_MODE || 'local';

export const commentQueue = RUN_MODE === 'local'
  ? new Queue("comment_events", {
    connection: { host: "localhost", port: 6379 }
  })
  : null;