import crypto from 'crypto';
import { prisma } from '../prisma';

export class AnalyticsService {
    static async handleRedirect(trackingId: string, ip: string, userAgent?: string, referer?: string) {
        const decoded = Buffer.from(trackingId, 'base64url').toString('utf-8');
        const [automationId, buttonId] = decoded.split(':');

        if (!automationId || !buttonId) throw new Error('Invalid tracking ID');

        const automation = await prisma.automation.findUnique({
            where: { id: automationId },
            select: { id: true, tenantId: true, ctaButtons: true },
        });

        if (!automation) throw new Error('Link not found');

        const buttons = (automation.ctaButtons as any[]) || [];
        const button = buttons.find((b: any) => b.id === buttonId);
        if (!button || !button.url) throw new Error('Button not found');

        const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);

        await prisma.clickEvent.create({
            data: {
                automationId: automation.id,
                buttonId,
                tenantId: automation.tenantId,
                userAgent: userAgent || null,
                referer: referer || null,
                ipHash,
            },
        });

        return button.url;
    }

    static async getAutomationAnalytics(automationId: string, tenantId: string) {
        const automation = await prisma.automation.findFirst({
            where: { id: automationId, tenantId, isDeleted: false },
            select: { id: true, flowName: true, executionCount: true, ctaButtons: true, createdAt: true },
        });

        if (!automation) throw new Error('Automation not found');

        const clickCounts = await prisma.clickEvent.groupBy({
            by: ['buttonId'],
            where: { automationId },
            _count: { id: true },
        });

        const totalClicks = await prisma.clickEvent.count({ where: { automationId } });

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const clicksOverTime = await prisma.clickEvent.groupBy({
            by: ['clickedAt'],
            where: { automationId, clickedAt: { gte: sevenDaysAgo } },
            _count: { id: true },
            orderBy: { clickedAt: 'asc' },
        });

        const buttons = (automation.ctaButtons as any[]) || [];
        const buttonAnalytics = buttons.map((btn: any) => {
            const count = clickCounts.find((c: any) => c.buttonId === btn.id)?._count?.id || 0;
            return {
                id: btn.id,
                label: btn.label,
                url: btn.url,
                clicks: count,
                ctr: automation.executionCount > 0 ? ((count / automation.executionCount) * 100).toFixed(1) : '0.0',
            };
        });

        return {
            automationId: automation.id,
            flowName: automation.flowName,
            executionCount: automation.executionCount,
            totalClicks,
            ctr: automation.executionCount > 0 ? ((totalClicks / automation.executionCount) * 100).toFixed(1) : '0.0',
            buttons: buttonAnalytics,
            clicksOverTime: clicksOverTime.map((c: any) => ({
                date: (c as any).clickedAt,
                clicks: (c as any)._count.id,
            })),
            createdAt: automation.createdAt,
        };
    }

    static async getOverview(tenantId: string) {
        const automations = await prisma.automation.findMany({
            where: { tenantId, isDeleted: false },
            select: { id: true, flowName: true, executionCount: true, isEnabled: true, scopeMediaId: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });

        const clickCounts = await prisma.clickEvent.groupBy({
            by: ['automationId'],
            where: { tenantId },
            _count: { id: true },
        });

        const clickMap = new Map(clickCounts.map((c: any) => [c.automationId, c._count.id] as [string, number]));
        const totalExecutions = automations.reduce((sum: number, a: any) => sum + (a.executionCount || 0), 0);
        let totalClicks = 0;
        clickMap.forEach((count: any) => { totalClicks += (count as number); });

        const automationStats = automations.map((a: any) => ({
            id: a.id,
            flowName: a.flowName || 'Unnamed Flow',
            executionCount: a.executionCount,
            clicks: (clickMap.get(a.id) as number) || 0,
            ctr: a.executionCount > 0 ? (((clickMap.get(a.id) as number || 0) / a.executionCount) * 100).toFixed(1) : '0.0',
            isEnabled: a.isEnabled,
            scopeMediaId: a.scopeMediaId,
            createdAt: a.createdAt,
        }));

        return {
            totalAutomations: automations.length,
            activeAutomations: automations.filter((a: any) => a.isEnabled).length,
            totalExecutions,
            totalClicks,
            overallCtr: totalExecutions > 0 ? (((totalClicks as number) / totalExecutions) * 100).toFixed(1) : '0.0',
            automations: automationStats,
        };
    }
}
