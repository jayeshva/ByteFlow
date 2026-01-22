import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscription.service';

export class SubscriptionController {
    static async getPlans(req: Request, res: Response) {
        const plans = await SubscriptionService.getPlans();
        res.status(200).json({ success: true, data: { plans } });
    }

    static async getCurrent(req: Request, res: Response) {
        const tenantId = (req as any).user.tenantId;
        const result = await SubscriptionService.getCurrentSubscription(tenantId);
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.status(200).json({ success: true, data: result });
    }

    static async checkout(req: Request, res: Response) {
        const tenantId = (req as any).user.tenantId;
        const { planId } = req.body;
        const provider = req.query.provider as string;

        const result = await SubscriptionService.createCheckout(tenantId, planId, provider);
        res.status(200).json({ success: true, data: result });
    }

    static async webhook(req: Request, res: Response) {
        // In a real app, verify signature here
        await SubscriptionService.handleWebhookEvent(req.body);
        res.status(200).json({ received: true });
    }
}
