import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { DodoService } from '../services/dodo.service';

const router = Router();

/**
 * GET /subscription/plans
 * List all available subscription plans
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        priceMonthly: true,
        dmLimitMonthly: true,
        features: true,
      },
    });

    res.json({ plans });
  } catch (error) {
    console.error('Failed to fetch plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

/**
 * GET /subscription/current
 * Get tenant's current subscription and usage
 */
router.get('/current', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        plan: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get the active subscription or fall back to Free plan data
    const subscription = tenant.subscription;
    let plan = subscription?.plan || tenant.plan;

    // If no plan assigned, fetch the Free plan as default
    if (!plan) {
      plan = await prisma.plan.findFirst({
        where: { name: 'FREE' },
      });
    }

    res.json({
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        dodoCustomerId: subscription.dodoCustomerId,
      } : null,
      plan: plan ? {
        id: plan.id,
        name: plan.name,
        displayName: plan.displayName,
        priceMonthly: plan.priceMonthly,
        dmLimitMonthly: plan.dmLimitMonthly,
        features: plan.features,
      } : null,
      usage: {
        dmSentThisMonth: tenant.dmSentThisMonth,
        dmQuotaMonthly: plan?.dmLimitMonthly || tenant.dmQuotaMonthly,
        dmSentLifetime: tenant.dmSentLifetime,
      },
    });
  } catch (error) {
    console.error('Failed to fetch subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * POST /subscription/checkout
 * Create Dodo checkout session for plan upgrade
 */
router.post('/checkout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    // Get the plan
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.dodoProductId) {
      return res.status(400).json({ error: 'Invalid plan or plan not available for purchase' });
    }

    // Get tenant and user info
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: { where: { role: 'owner' }, take: 1 },
        subscription: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const ownerEmail = tenant.users[0]?.email || 'customer@example.com';
    const ownerName = tenant.users[0]?.name || tenant.name;

    // Create checkout session with Dodo
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const checkout = await DodoService.createSubscriptionCheckout({
      planId: plan.id,
      dodoProductId: plan.dodoProductId,
      tenantId: tenantId,  // Passed to metadata for webhook processing
      customerId: tenant.subscription?.dodoCustomerId || undefined,
      customerEmail: ownerEmail,
      customerName: ownerName,
      successUrl: `${frontendUrl}/subscription/success?plan=${plan.name}`,
      cancelUrl: `${frontendUrl}/subscription/cancel`,
    });

    res.json({
      paymentLink: checkout.paymentLink,
      planName: plan.displayName,
    });
  } catch (error) {
    console.error('Failed to create checkout:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /subscription/webhook
 * Handle Dodo webhook events
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['webhook-signature'] as string || 
                      req.headers['dodo-signature'] as string || '';
    const timestamp = req.headers['webhook-timestamp'] as string || '';
    const webhookId = req.headers['webhook-id'] as string || '';
    const rawBody = JSON.stringify(req.body);

    // console.log('Webhook received, signature:', signature ? 'present' : 'missing');
    // console.log('Webhook timestamp:', timestamp, 'webhookId:', webhookId);

    // Skip signature verification if DODO_WEBHOOK_SECRET is not configured (development mode)
    const webhookSecret = process.env.DODO_WEBHOOK_SECRET;
    if (webhookSecret && !DodoService.verifyWebhookSignature(rawBody, signature, timestamp, webhookId)) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const eventType = event.type || event.event_type || 'unknown';
    console.log('Dodo webhook event type:', eventType);

    switch (eventType) {
      case 'payment.succeeded':
      case 'payment_succeeded':
        await handlePaymentSucceeded(event.data || event);
        break;
      case 'subscription.active':
      case 'subscription_active':
        await handleSubscriptionActive(event.data || event);
        break;
      case 'subscription.cancelled':
      case 'subscription_cancelled':
        await handleSubscriptionCancelled(event.data || event);
        break;
      case 'subscription.past_due':
      case 'subscription_past_due':
        await handleSubscriptionPastDue(event.data || event);
        break;
      default:
        console.log('Unhandled webhook event:', eventType);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /subscription/cancel
 * Cancel current subscription
 */
router.post('/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user.tenantId;

    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    if (subscription.dodoSubscriptionId) {
      const cancelled = await DodoService.cancelSubscription(subscription.dodoSubscriptionId);
      if (!cancelled) {
        return res.status(500).json({ error: 'Failed to cancel subscription with payment provider' });
      }
    }

    // Update local subscription status
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'cancelled' },
    });

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * GET /subscription/portal
 * Get customer portal link for managing subscription
 */
router.get('/portal', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user.tenantId;

    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription?.dodoCustomerId) {
      return res.status(404).json({ error: 'No customer portal available' });
    }

    const portalLink = await DodoService.getCustomerPortalLink(subscription.dodoCustomerId);

    if (!portalLink) {
      return res.status(500).json({ error: 'Failed to get customer portal' });
    }

    res.json({ portalLink });
  } catch (error) {
    console.error('Failed to get portal link:', error);
    res.status(500).json({ error: 'Failed to get portal link' });
  }
});

// Webhook handlers

async function handlePaymentSucceeded(data: any) {
  const { customer_id, product_id, subscription_id, metadata } = data;
  
  // Find plan by Dodo product ID
  const plan = await prisma.plan.findFirst({
    where: { dodoProductId: product_id },
  });

  if (!plan) {
    console.error('Plan not found for product:', product_id);
    return;
  }

  // Find tenant by customer metadata or email
  // This assumes we pass tenantId in metadata during checkout
  const tenantId = metadata?.tenantId;
  if (!tenantId) {
    console.error('No tenantId in payment metadata');
    return;
  }

  // Create or update subscription
  await prisma.subscription.upsert({
    where: { tenantId },
    create: {
      tenantId,
      planId: plan.id,
      status: 'active',
      dodoSubscriptionId: subscription_id,
      dodoCustomerId: customer_id,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    update: {
      planId: plan.id,
      status: 'active',
      dodoSubscriptionId: subscription_id,
      dodoCustomerId: customer_id,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Update tenant's DM quota
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      planId: plan.id,
      dmQuotaMonthly: plan.dmLimitMonthly,
      dmSentThisMonth: 0, // Reset on new subscription
    },
  });

  // Log transaction
  await prisma.transactionHistory.create({
    data: {
      tenantId,
      planId: plan.id,
      amount: plan.priceMonthly,
      currency: 'INR',
      status: 'SUCCESS',
      provider: 'Dodo',
      providerRef: subscription_id || data.payment_id,
    },
  });

  console.log('Subscription activated for tenant:', tenantId);
}

async function handleSubscriptionActive(data: any) {
  const { subscription_id, current_period_start, current_period_end } = data;

  const subscription = await prisma.subscription.findUnique({
    where: { dodoSubscriptionId: subscription_id },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'active',
        currentPeriodStart: new Date(current_period_start),
        currentPeriodEnd: new Date(current_period_end),
      },
    });

    // Reset monthly DM count on renewal
    await prisma.tenant.update({
      where: { id: subscription.tenantId },
      data: { dmSentThisMonth: 0 },
    });
  }
}

async function handleSubscriptionCancelled(data: any) {
  const { subscription_id } = data;

  const subscription = await prisma.subscription.findUnique({
    where: { dodoSubscriptionId: subscription_id },
    include: { tenant: true },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'cancelled' },
    });

    // Downgrade to Free plan
    const freePlan = await prisma.plan.findFirst({
      where: { name: 'FREE' },
    });

    if (freePlan) {
      await prisma.tenant.update({
        where: { id: subscription.tenantId },
        data: {
          planId: freePlan.id,
          dmQuotaMonthly: freePlan.dmLimitMonthly,
        },
      });
    }
  }
}

async function handleSubscriptionPastDue(data: any) {
  const { subscription_id } = data;

  await prisma.subscription.updateMany({
    where: { dodoSubscriptionId: subscription_id },
    data: { status: 'past_due' },
  });
}

export default router;
