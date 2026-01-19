import { Request, Response } from "express";
import { commentQueue } from "../queues/comment.queue";

export class MessageWebhookController {
  /**
   * Handle messaging webhook events including Quick Reply button clicks
   */
  static async handleWebhook(req: Request, res: Response) {
    try {
      const body = req.body;
      
      if (!body.entry) return res.sendStatus(200);

      for (const entry of body.entry) {
        const messaging = entry.messaging || [];

        for (const event of messaging) {
          // Check for Quick Reply button click
          if (event.message?.quick_reply) {
            const payload = event.message.quick_reply.payload;
            const senderId = event.sender?.id;
            
            console.log("📩 Quick Reply received:", { payload, senderId });
            
            // Handle FOLLOW_CHECK payload
            if (payload?.startsWith("FOLLOW_CHECK:")) {
              await this.handleFollowCheck(payload, senderId, entry.id);
            }
          }
        }
      }

      return res.sendStatus(200);
    } catch (err) {
      console.error("Message Webhook Error:", err);
      res.sendStatus(500);
    }
  }

  /**
   * Handle the "I Followed" button click by enqueueing to the comment queue
   */
  static async handleFollowCheck(payload: string, senderId: string, igUserId: string) {
    try {
      // Extract automation ID from payload
      const automationId = payload.split(":")[1];
      
      console.log(`📩 handleFollowCheck - Enqueueing follow confirm job:`);
      console.log(`   - automationId: ${automationId}`);
      console.log(`   - senderId: ${senderId}`);
      console.log(`   - igUserId: ${igUserId}`);

      // Enqueue to the same comment queue with isFollowConfirm flag
      await commentQueue.add("comment_events", {
        tenantId: igUserId, // This will be used to find the IG account
        automationId: automationId,
        senderId: senderId,
        isFollowConfirm: true, // Flag to indicate this is a follow confirmation
        timestamp: Date.now(),
      });
      
      console.log("✅ Follow confirm job enqueued");
      
    } catch (err: any) {
      console.error("❌ Failed to enqueue follow confirm:", err.message);
    }
  }
}
