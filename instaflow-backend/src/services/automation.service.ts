import { prisma } from '../prisma';

export class AutomationService {
    static async createAutomation(data: any, tenantId: string, igAccountId: string) {
        // Check if an automation already exists for this特定 post
        if (data.scopeType === 'POST' && data.scopeMediaId) {
            const existing = await prisma.automation.findFirst({
                where: {
                    tenantId,
                    igAccountId,
                    scopeType: 'POST',
                    scopeMediaId: data.scopeMediaId,
                    isDeleted: false,
                },
            });

            if (existing) {
                throw new Error('An automation already exists for this post.');
            }
        }

        return prisma.automation.create({
            data: {
                tenantId,
                igAccountId,
                ...data,
            },
        });
    }

    static async listAutomations(tenantId: string) {
        return prisma.automation.findMany({
            where: { tenantId, isDeleted: false },
        });
    }

    static async updateAutomation(automationId: string, data: any) {
        return prisma.automation.update({
            where: { id: automationId },
            data,
        });
    }

    static async deleteAutomation(automationId: string) {
        return prisma.automation.update({
            where: { id: automationId },
            data: { isDeleted: true },
        });
    }

    static async getActivityLogs(tenantId: string, limit: number, cursor?: bigint) {
        const logs = await prisma.messageLog.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...(cursor && {
                cursor: { id: cursor },
                skip: 1,
            }),
        });

        const hasMore = logs.length > limit;
        const displayLogs = hasMore ? logs.slice(0, -1) : logs;
        const nextCursor = hasMore && logs.length > 0 ? logs[logs.length - 2].id.toString() : null;

        return {
            logs: displayLogs,
            hasMore,
            nextCursor,
        };
    }
}
