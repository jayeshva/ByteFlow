import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';

export class AnalyticsController {
    static async redirect(req: Request, res: Response) {
        const { trackingId } = req.params;
        const ip = req.ip || 'unknown';
        const userAgent = req.headers['user-agent'];
        const referer = req.headers['referer'];

        const destinationUrl = await AnalyticsService.handleRedirect(trackingId, ip, userAgent, referer);
        res.redirect(302, destinationUrl);
    }

    static async getAutomationAnalytics(req: Request, res: Response) {
        const { automationId } = req.params;
        const tenantId = (req as any).user.tenantId;

        const result = await AnalyticsService.getAutomationAnalytics(automationId, tenantId);
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.status(200).json({ success: true, data: result });
    }

    static async getOverview(req: Request, res: Response) {
        const tenantId = (req as any).user.tenantId;
        const result = await AnalyticsService.getOverview(tenantId);
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.status(200).json({ success: true, data: result });
    }
}
