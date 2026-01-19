import { z } from 'zod';

/**
 * Instagram Data Zod Schemas
 * Validation for posts, profiles, and comments from Instagram API
 */

// Media Type
export const mediaTypeSchema = z.enum([
    'IMAGE',
    'VIDEO',
    'CAROUSEL_ALBUM',
]);

// Instagram Post Schema
export const instagramPostSchema = z.object({
    id: z.string(),
    media_url: z.string().url().optional(),
    mediaUrl: z.string().url().optional(),
    thumbnail_url: z.string().url().optional(),
    thumbnailURL: z.string().url().optional(),
    caption: z.string().optional().default(''),
    like_count: z.number().optional().default(0),
    likes: z.number().optional().default(0),
    comments_count: z.number().optional().default(0),
    comments: z.number().optional().default(0),
    media_type: z.string().optional(),
    mediaType: z.string().optional(),
    timestamp: z.string(),
    permalink: z.string().url().optional(),
});

// Normalized Post (for frontend use)
export const normalizedPostSchema = z.object({
    id: z.string(),
    mediaUrl: z.string(),
    thumbnailURL: z.string().optional(),
    caption: z.string(),
    likes: z.number(),
    comments: z.number(),
    mediaType: z.string(),
    timestamp: z.string(),
});

// Instagram Profile Schema
export const instagramProfileSchema = z.object({
    id: z.string().optional(),
    username: z.string(),
    name: z.string().optional(),
    profile_picture_url: z.string().url().optional(),
    profile_pic_url: z.string().url().optional(),
    followers_count: z.number().optional(),
    follows_count: z.number().optional(),
    media_count: z.number().optional(),
    isIGconnected: z.boolean().optional(),
    userFullName: z.string().optional(),
    userEmail: z.string().email().optional(),
});

// Comment Reply Schema
export const commentReplySchema = z.object({
    id: z.string(),
    text: z.string(),
    username: z.string(),
    timestamp: z.string().optional(),
});

// Comment Schema
export const commentSchema = z.object({
    id: z.string(),
    text: z.string(),
    username: z.string(),
    timestamp: z.string().optional(),
    replies: z.array(commentReplySchema).optional().default([]),
});

// Comments Response Schema
export const commentsResponseSchema = z.object({
    comments: z.array(commentSchema),
    paging: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable(),
    }),
});

// Posts Response Schema
export const postsResponseSchema = z.object({
    posts: z.array(instagramPostSchema),
});

// Profile Response Schema
export const profileResponseSchema = z.object({
    profile: instagramProfileSchema,
});

// Type exports
export type MediaType = z.infer<typeof mediaTypeSchema>;
export type InstagramPost = z.infer<typeof instagramPostSchema>;
export type NormalizedPost = z.infer<typeof normalizedPostSchema>;
export type InstagramProfile = z.infer<typeof instagramProfileSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type CommentReply = z.infer<typeof commentReplySchema>;
export type CommentsResponse = z.infer<typeof commentsResponseSchema>;
