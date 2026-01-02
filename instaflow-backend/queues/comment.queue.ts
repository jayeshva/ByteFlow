import { Queue } from "bullmq";

export const commentQueue = new Queue("comment_events", {
  connection: { host: "localhost", port: 6379 }
});
// connection: { host: "redis", port: 6379 } --- IGNORE ---