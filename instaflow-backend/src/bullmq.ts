import type { Express } from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { commentQueue } from "./queues/comment.queue";
import { retryQueue } from "./queues/retry.queue";

const bullBoardBasePath = "/admin/queues";

export function registerBullMQUI(app: Express) {
  const bullBoardAdapter = new ExpressAdapter();
  bullBoardAdapter.setBasePath(bullBoardBasePath);

  const queues = [];
  if (commentQueue) queues.push(new BullMQAdapter(commentQueue));
  if (retryQueue) queues.push(new BullMQAdapter(retryQueue));

  createBullBoard({
    queues,
    serverAdapter: bullBoardAdapter
  });

  app.use(bullBoardBasePath, bullBoardAdapter.getRouter());
}
