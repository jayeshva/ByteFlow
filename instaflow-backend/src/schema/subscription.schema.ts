import { z } from 'zod';

export const checkoutSchema = z.object({
    body: z.object({
        planId: z.string().uuid(),
    }),
    query: z.object({
        provider: z.enum(['dodo', 'cashfree']).optional(),
    }),
});

export const cancelSubscriptionSchema = z.object({
    // No specific body needed usually, but could be tenantId if admin
});
