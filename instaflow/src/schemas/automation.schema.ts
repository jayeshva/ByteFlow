import { z } from 'zod';

/**
 * Automation Zod Schemas
 * Validation for automation rules, triggers, and responses
 */

// Trigger Types
export const triggerTypeSchema = z.enum([
    'EXACT_MATCH',
    'CONTAINS',
    'EVERY_COMMENT',
    'AI_INTENT',
]);

// Scope Types
export const scopeTypeSchema = z.enum([
    'SPECIFIC_POST',
    'ALL_POSTS',
]);

// CTA Button Schema
export const ctaButtonSchema = z.object({
    id: z.string(),
    label: z.string().min(1, 'Button label is required').max(20, 'Label must be 20 characters or less'),
    url: z.string().url('Please enter a valid URL'),
});

// Scheduling Schema
export const schedulingSchema = z.object({
    enabled: z.boolean(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
}).refine((data) => {
    if (data.enabled && data.startDate && data.endDate) {
        return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
}, {
    message: 'End date must be after start date',
    path: ['endDate'],
});

// Create Automation Schema
export const createAutomationSchema = z.object({
    scopeType: scopeTypeSchema,
    scopeMediaId: z.string().optional(),
    triggerType: triggerTypeSchema,
    triggerKeywords: z.array(z.string()).min(1, 'At least one keyword is required').optional(),
    privateReplyText: z.string().min(1, 'DM message is required').max(1000, 'Message must be 1000 characters or less'),
    enablePublicReply: z.boolean().default(false),
    publicReplies: z.array(z.string().max(100, 'Reply must be 100 characters or less')).optional(),
    requireFollow: z.boolean().default(false),
    followPromptText: z.string().max(500, 'Follow prompt must be 500 characters or less').optional(),
    ctaButtons: z.array(ctaButtonSchema).max(3, 'Maximum 3 CTA buttons allowed').optional(),
    scheduling: schedulingSchema.optional(),
    isEnabled: z.boolean().default(true),
}).refine((data) => {
    // If trigger type is not EVERY_COMMENT, keywords are required
    if (data.triggerType !== 'EVERY_COMMENT' && (!data.triggerKeywords || data.triggerKeywords.length === 0)) {
        return false;
    }
    return true;
}, {
    message: 'Keywords are required for this trigger type',
    path: ['triggerKeywords'],
});

// Update Automation Schema (all fields optional)
export const updateAutomationSchema = createAutomationSchema.partial();

// Automation Stats Schema
export const automationStatsSchema = z.object({
    totalSent: z.number().default(0),
    engagementBoost: z.number().default(0),
    lastTriggered: z.string().optional(),
});

// Full Automation Response Schema
export const automationResponseSchema = z.object({
    id: z.string(),
    scopeType: z.string().optional(),
    scopeMediaId: z.string().optional(),
    postId: z.string().optional(),
    triggerType: z.string().optional(),
    matchType: z.string().optional(),
    triggerKeyword: z.string().optional(),
    triggerKeywords: z.array(z.string()).optional(),
    privateReplyText: z.string().optional(),
    responseMessage: z.string().optional(),
    enablePublicReply: z.boolean().optional(),
    publicReplyText: z.string().optional(),
    publicReplies: z.array(z.string()).optional(),
    requireFollow: z.boolean().optional(),
    followPromptText: z.string().optional(),
    ctaButtons: z.array(ctaButtonSchema).optional(),
    isEnabled: z.boolean().optional(),
    active: z.boolean().optional(),
    isAutomationTimingEnabled: z.boolean().optional(),
    automationStartTime: z.string().optional(),
    automationEndTime: z.string().optional(),
    executionCount: z.number().optional(),
    flowName: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
});

export const automationsListResponseSchema = z.array(automationResponseSchema);

// Type exports
export type TriggerType = z.infer<typeof triggerTypeSchema>;
export type ScopeType = z.infer<typeof scopeTypeSchema>;
export type CtaButton = z.infer<typeof ctaButtonSchema>;
export type Scheduling = z.infer<typeof schedulingSchema>;
export type CreateAutomationData = z.infer<typeof createAutomationSchema>;
export type UpdateAutomationData = z.infer<typeof updateAutomationSchema>;
export type AutomationResponse = z.infer<typeof automationResponseSchema>;
