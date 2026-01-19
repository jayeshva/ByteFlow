import { z } from 'zod';

/**
 * Subscription Zod Schemas
 * Validation for plans, subscriptions, and payments
 */

// Plan Schema
export const planSchema = z.object({
    id: z.string(),
    name: z.string(),
    displayName: z.string(),
    priceMonthly: z.number(),
    dmLimitMonthly: z.number(),
    features: z.array(z.string()),
});

// Subscription Status
export const subscriptionStatusSchema = z.enum([
    'active',
    'canceled',
    'past_due',
    'trialing',
    'inactive',
]);

// Active Subscription Schema
export const subscriptionSchema = z.object({
    id: z.string(),
    status: z.string(),
    currentPeriodStart: z.string(),
    currentPeriodEnd: z.string(),
    dodoCustomerId: z.string().optional(),
    cancelAtPeriodEnd: z.boolean().optional(),
});

// Usage Schema
export const usageSchema = z.object({
    dmSentThisMonth: z.number(),
    dmQuotaMonthly: z.number(),
    dmSentLifetime: z.number(),
});

// Subscription Data Response Schema
export const subscriptionDataSchema = z.object({
    subscription: subscriptionSchema.nullable(),
    plan: planSchema.nullable(),
    usage: usageSchema,
});

// Plans List Response Schema
export const plansResponseSchema = z.object({
    plans: z.array(planSchema),
});

// Checkout Response Schema
export const checkoutResponseSchema = z.object({
    paymentLink: z.string().url(),
    planName: z.string(),
});

// Portal Response Schema
export const portalResponseSchema = z.object({
    portalLink: z.string().url(),
});

// Cancel Response Schema
export const cancelResponseSchema = z.object({
    message: z.string(),
});

// Type exports
export type Plan = z.infer<typeof planSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type Usage = z.infer<typeof usageSchema>;
export type SubscriptionData = z.infer<typeof subscriptionDataSchema>;
