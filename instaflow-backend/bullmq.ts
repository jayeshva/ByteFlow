import type { Express } from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { commentQueue } from "./queues/comment.queue";

const bullBoardBasePath = "/admin/queues";

export function registerBullMQUI(app: Express) {
  const bullBoardAdapter = new ExpressAdapter();
  bullBoardAdapter.setBasePath(bullBoardBasePath);

  createBullBoard({
    queues: [new BullMQAdapter(commentQueue)],
    serverAdapter: bullBoardAdapter
  });

  app.use(bullBoardBasePath, bullBoardAdapter.getRouter());
}
