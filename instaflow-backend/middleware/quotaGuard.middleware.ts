import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

/**
 * Middleware to enforce DM quota limits based on subscription plan
 * Use this before any route that sends DMs
 */
export const quotaGuard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: {
          include: { plan: true },
        },
        plan: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get the DM limit from subscription plan or fallback to tenant's quota
    const plan = tenant.subscription?.plan || tenant.plan;
    const dmLimit = plan?.dmLimitMonthly || tenant.dmQuotaMonthly;
    const dmSent = tenant.dmSentThisMonth;

    // Check if quota exceeded
    if (dmSent >= dmLimit) {
      return res.status(429).json({
        error: 'DM quota exceeded',
        code: 'QUOTA_EXCEEDED',
        message: `You have reached your monthly DM limit of ${dmLimit}. Upgrade your plan for more DMs.`,
        quota: {
          used: dmSent,
          limit: dmLimit,
          remaining: 0,
          planName: plan?.displayName || plan?.name || 'Free',
        },
      });
    }

    // Add quota info to request for downstream use
    (req as any).quota = {
      used: dmSent,
      limit: dmLimit,
      remaining: dmLimit - dmSent,
      planName: plan?.displayName || plan?.name || 'Free',
    };

    // Add remaining quota to response headers
    res.setHeader('X-DM-Quota-Remaining', dmLimit - dmSent);
    res.setHeader('X-DM-Quota-Limit', dmLimit);

    next();
  } catch (error) {
    console.error('Quota guard error:', error);
    return res.status(500).json({ error: 'Failed to check quota' });
  }
};

/**
 * Increment DM count for a tenant after sending a DM
 * Call this after successfully sending a DM
 */
export const incrementDmCount = async (tenantId: string, count: number = 1): Promise<void> => {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      dmSentThisMonth: { increment: count },
      dmSentLifetime: { increment: count },
    },
  });
};

export default quotaGuard;
