import { z } from 'zod';

export const createAutomationSchema = z.object({
    body: z.object({
        scopeType: z.enum(['POST', 'ALL_POSTS']),
        scopeMediaId: z.string().optional(),
        automationType: z.string(),
        matchType: z.enum(['CONTAINS', 'EXACT', 'REGEX', 'INTENT']),
        triggerKeyword: z.string().optional(),
        triggerKeywords: z.array(z.string()).optional(),
        intentLabel: z.string().optional(),
        flowName: z.string().optional(),
        enablePublicReply: z.boolean().optional(),
        publicReplyText: z.string().optional(),
        publicReplies: z.array(z.string()).optional(),
        privateReplyText: z.string(),
        isAutomationTimingEnabled: z.boolean().optional(),
        automationStartTime: z.string().nullable().optional(),
        automationEndTime: z.string().nullable().optional(),
        requireFollow: z.boolean().optional(),
        followPromptText: z.string().nullable().optional(),
        ctaButtons: z.array(z.object({
            id: z.string(),
            label: z.string(),
            url: z.string().url()
        })).optional(),
    }),
});

export const updateAutomationSchema = z.object({
    params: z.object({
        automationId: z.string().uuid(),
    }),
    body: createAutomationSchema.shape.body.partial(),
});

export const deleteAutomationSchema = z.object({
    params: z.object({
        automationId: z.string().uuid(),
    }),
});
