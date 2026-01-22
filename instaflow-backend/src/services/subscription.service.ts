import { prisma } from '../prisma';
import { DodoService } from './dodo.service';
import { CashfreeService } from './cashfree.service';
import logger from '../utils/logger';

export class SubscriptionService {
    static async getPlans() {
        return prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { priceMonthly: 'asc' },
            select: { id: true, name: true, displayName: true, priceMonthly: true, dmLimitMonthly: true, features: true },
        });
    }

    static async getCurrentSubscription(tenantId: string) {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { subscription: { include: { plan: true } }, plan: true },
        });
        if (!tenant) throw new Error('Tenant not found');

        const subscription = tenant.subscription;
        let plan = subscription?.plan || tenant.plan;
        if (!plan) plan = await prisma.plan.findFirst({ where: { name: 'FREE' } });

        return {
            subscription: subscription ? { id: subscription.id, status: subscription.status } : null,
            plan: plan ? { id: plan.id, name: plan.name, dmLimitMonthly: plan.dmLimitMonthly } : null,
            usage: { dmSentThisMonth: tenant.dmSentThisMonth, dmQuotaMonthly: plan?.dmLimitMonthly || 0 },
        };
    }

    static async createCheckout(tenantId: string, planId: string, provider: string = 'dodo') {
        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) throw new Error('Invalid plan');

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { users: { where: { role: 'owner' }, take: 1 }, subscription: true },
        });
        if (!tenant) throw new Error('Tenant not found');

        const owner = tenant.users[0];
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        if (provider === 'cashfree') {
            return CashfreeService.createSubscriptionCheckout({
                planId: plan.id,
                tenantId,
                customerEmail: owner?.email || '',
                customerPhone: (owner as any)?.phone || '9999999999',
                amount: plan.priceMonthly * 100,
                successUrl: `${frontendUrl}/subscription/success`,
            });
        }

        if (!plan.dodoProductId) throw new Error('Plan not available for Dodo');
        return DodoService.createSubscriptionCheckout({
            planId: plan.id,
            dodoProductId: plan.dodoProductId,
            tenantId,
            customerId: tenant.subscription?.dodoCustomerId || undefined,
            customerEmail: owner?.email || '',
            successUrl: `${frontendUrl}/subscription/success`,
        });
    }

    // Webhook handling logic would be implemented here as methods
    static async handleWebhookEvent(event: any) {
        // Implement existing handlePaymentSucceeded, handleSubscriptionActive etc here
        logger.info({ eventType: event.type }, 'Handling payment webhook');
    }
}
