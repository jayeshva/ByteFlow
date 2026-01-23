import 'dotenv/config';
import { prisma } from '../../src/prisma';

/**
 * Seed subscription plans: Free, Pro, Ultra
 * Run with: npx ts-node prisma/seeds/seed-plans.ts
 */
async function seedPlans() {
  console.log('Seeding subscription plans...');

  const plans = [
    {
      name: 'FREE',
      displayName: 'Free',
      priceMonthly: 0,
      dmLimitMonthly: 1000000,
      dodoProductId: null, // Free plan doesn't need Dodo product
      features: [
        '1000000 DMs per month',
        '1 Instagram account',
        'Basic automation triggers',
        'Community support',
      ],
    },
    {
      name: 'PRO',
      displayName: 'Pro',
      priceMonthly: 99900, // ₹999 in paise
      dmLimitMonthly: 2000,
      dodoProductId: process.env.DODO_PRO_PRODUCT_ID || null,
      features: [
        '2,000 DMs per month',
        '3 Instagram accounts',
        'Advanced automation triggers',
        'AI-powered intent matching',
        'Priority support',
        'Analytics dashboard',
      ],
    },
    {
      name: 'ULTRA',
      displayName: 'Ultra',
      priceMonthly: 249900, // ₹2,499 in paise
      dmLimitMonthly: 10000,
      dodoProductId: process.env.DODO_ULTRA_PRODUCT_ID || null,
      features: [
        '10,000 DMs per month',
        'Unlimited Instagram accounts',
        'All automation triggers',
        'AI-powered intent matching',
        'Custom integrations',
        'Dedicated support',
        'White-label options',
        'API access',
      ],
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {
        displayName: plan.displayName,
        priceMonthly: plan.priceMonthly,
        dmLimitMonthly: plan.dmLimitMonthly,
        dodoProductId: plan.dodoProductId,
        features: plan.features,
        isActive: true,
      },
      create: {
        name: plan.name,
        displayName: plan.displayName,
        priceMonthly: plan.priceMonthly,
        dmLimitMonthly: plan.dmLimitMonthly,
        dodoProductId: plan.dodoProductId,
        features: plan.features,
        isActive: true,
      },
    });
    console.log(`✓ Upserted plan: ${plan.displayName}`);
  }

  console.log('Done seeding plans!');
}

// Run if executed directly
seedPlans()
  .catch((e) => {
    console.error('Failed to seed plans:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { seedPlans };
