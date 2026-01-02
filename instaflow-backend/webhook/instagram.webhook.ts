import { Request, Response } from "express";
import { commentQueue } from "../queues/comment.queue";

export class InstagramWebhookController {
  static async handleWebhook(req: Request, res: Response) {
    try {
      const body = req.body;
      // console.log("Received Instagram Webhook:", JSON.stringify(body, null, 2));

      if (!body.entry) return res.sendStatus(200);

      for (const entry of body.entry) {
        const changes = entry.changes || [];

        for (const change of changes) {
          if (change.field === "comments") {
            const value = change.value;

            // Extract sender's IGSID (Instagram-scoped ID) for DM sending
            // The 'from' object contains: { id: IGSID, username: string }
            const eventData = {
              tenantId: entry.id,      
              mediaId: value.media.id,
              commentId: value.id,
              text: value.text,
              senderId: value.from?.id,     // IGSID - required for DMs
              username: value.from?.username,
              timestamp: entry.time,
            };

            await commentQueue.add("comment_events", eventData);
            console.log("Enqueued comment event:", eventData);
          }
        }
      }

      return res.sendStatus(200);

    } catch (err) {
      console.error("Webhook Error:", err);
      res.sendStatus(500);
    }
  }
}
