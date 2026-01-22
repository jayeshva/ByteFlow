import { z } from 'zod';

export const trackClickSchema = z.object({
    params: z.object({
        trackingId: z.string(),
    }),
});

export const getAutomationAnalyticsSchema = z.object({
    params: z.object({
        automationId: z.string().uuid(),
    }),
});
