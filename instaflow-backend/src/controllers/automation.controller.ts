import { Request, Response } from 'express';
import { AutomationService } from '../services/automation.service';
import { prisma } from '../prisma';

export class AutomationController {
    static async createAutomation(req: Request, res: Response) {
        const tenantId = (req as any).user.tenantId;

        const igAccount = await prisma.iGAccount.findFirst({
            where: { tenantId, isActive: true },
        });

        if (!igAccount) {
            return res.status(404).json({ success: false, error: 'Instagram account not found' });
        }

        const automation = await AutomationService.createAutomation(req.body, tenantId, igAccount.id);
        res.status(201).json({ success: true, message: 'Automation created', data: automation });
    }

    static async listAutomations(req: Request, res: Response) {
        const tenantId = (req as any).user.tenantId;
        const automations = await AutomationService.listAutomations(tenantId);
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.status(200).json({ success: true, data: automations });
    }

    static async updateAutomation(req: Request, res: Response) {
        const { automationId } = req.params;
        const updated = await AutomationService.updateAutomation(automationId, req.body);
        res.status(200).json({ success: true, message: 'Automation updated', data: updated });
    }

    static async deleteAutomation(req: Request, res: Response) {
        const { automationId } = req.params;
        await AutomationService.deleteAutomation(automationId);
        res.status(200).json({ success: true, message: 'Automation deleted' });
    }

    static async getActivityLogs(req: Request, res: Response) {
        const tenantId = (req as any).user.tenantId;
        const limit = Number(req.query.limit) || 10;
        const cursor = req.query.cursor ? BigInt(req.query.cursor as string) : undefined;

        const result = await AutomationService.getActivityLogs(tenantId, limit, cursor);
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.status(200).json({ success: true, data: result });
    }
}
