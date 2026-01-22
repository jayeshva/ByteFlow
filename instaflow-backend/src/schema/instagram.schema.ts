import { z } from 'zod';

export const instagramCallbackSchema = z.object({
    query: z.object({
        code: z.string(),
        state: z.string(),
        popup: z.string().optional(),
    }),
});

export const getCommentsSchema = z.object({
    params: z.object({
        mediaId: z.string(),
    }),
    query: z.object({
        after: z.string().optional(),
        limit: z.string().optional(),
    }),
});
