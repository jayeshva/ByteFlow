import { Request, Response } from "express";
import { commentQueue } from "../queues/comment.queue";
import { MessageWebhookController } from "./message.webhook";

export class InstagramWebhookController {
  static async handleWebhook(req: Request, res: Response) {
    try {
      const body = req.body;
      // console.log("Received Instagram Webhook:", JSON.stringify(body, null, 2));

      if (!body.entry) return res.sendStatus(200);

      for (const entry of body.entry) {
        // Handle comment events
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field === "comments") {
            const value = change.value;

            // Skip replies to comments - only process direct/top-level comments
            // Instagram includes parent_id when comment is a reply
            if (value.parent_id) {
              console.log("ℹ️ Skipping reply comment (parent_id:", value.parent_id, ")");
              continue;
            }

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

            if (commentQueue) {
              await commentQueue.add("comment_events", eventData);
              console.log("Enqueued comment event:", eventData);
            } else {
              console.log("⚠️ skipping queue - commentQueue not initialized (cloud mode?)");
            }
          }
        }


        // Handle messaging events (Quick Reply and Postback button clicks)
        const messaging = entry.messaging || [];
        for (const event of messaging) {
          // Handle Quick Reply clicks
          if (event.message?.quick_reply) {
            const payload = event.message.quick_reply.payload;
            const senderId = event.sender?.id;

            console.log("📩 Quick Reply received:", { payload, senderId });

            // Handle FOLLOW_CHECK payload
            if (payload?.startsWith("FOLLOW_CHECK:")) {
              await MessageWebhookController.handleFollowCheck(payload, senderId, entry.id);
            }
          }

          // Handle Postback button clicks (Button Template)
          if (event.postback) {
            const payload = event.postback.payload;
            const senderId = event.sender?.id;

            console.log("📩 Postback button clicked:", { payload, senderId });

            // Handle FOLLOW_CHECK payload
            if (payload?.startsWith("FOLLOW_CHECK:")) {
              await MessageWebhookController.handleFollowCheck(payload, senderId, entry.id);
            }
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
