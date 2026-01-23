import axios from 'axios';
import { prisma } from '../prisma';
import { config } from '../config';
import { encryptToken, decryptToken } from '../utils/crypto.util';
import logger from '../utils/logger';
import {
    withMetaRateLimitRetry,
    parseRateLimitHeader,
    isApproachingRateLimit,
    META_RATE_LIMIT_CODES
} from '../utils/meta-rate-limit.util';

const TOKEN_EXPIRED_CODES = [190, 102, 463];
const TOKEN_EXPIRED_SUBCODES = [458, 460, 463];

export class InstagramService {
    static getLoginUrl(tenantId: string) {
        const scopes = [
            'instagram_business_basic',
            'instagram_business_manage_messages',
            'instagram_business_manage_comments',
            'instagram_business_content_publish',
            'instagram_business_manage_insights',
        ].join(',');

        return `https://www.instagram.com/oauth/authorize?client_id=${config.CLIENT_ID}&redirect_uri=${config.IG_REDIRECT_URI}&response_type=code&scope=${scopes}&state=${tenantId}`;
    }

    static async exchangeCodeForToken(code: string) {
        const url = 'https://api.instagram.com/oauth/access_token';
        const form = new URLSearchParams();
        form.append('client_id', config.CLIENT_ID || '');
        form.append('client_secret', config.CLIENT_SECRET || '');
        form.append('grant_type', 'authorization_code');
        form.append('redirect_uri', config.IG_REDIRECT_URI || '');
        form.append('code', code);

        const res = await axios.post(url, form);
        return res.data;
    }

    static async getLongLivedToken(shortToken: string) {
        const url = 'https://graph.instagram.com/access_token';
        const res = await axios.get(url, {
            params: {
                grant_type: 'ig_exchange_token',
                client_secret: config.CLIENT_SECRET,
                access_token: shortToken,
            },
        });
        return res.data;
    }

    static async getInstagramUser(longToken: string) {
        return withMetaRateLimitRetry(async () => {
            const url = `https://graph.instagram.com/v24.0/me?fields=id,user_id,username,name,profile_picture_url,media_count,followers_count,follows_count,account_type,biography&access_token=${longToken}`;
            const res = await axios.get(url);

            // Log rate limit headers for monitoring
            const rateLimitHeader = res.headers['x-business-use-case-usage'];
            if (rateLimitHeader) {
                const parsed = parseRateLimitHeader(rateLimitHeader);
                if (parsed) {
                    for (const businessId in parsed) {
                        if (isApproachingRateLimit(parsed[businessId])) {
                            logger.warn({ businessId, rateLimitInfo: parsed[businessId] }, 'Approaching Meta API rate limit');
                        }
                    }
                }
            }

            // logger.info({ igData: res.data }, 'Instagram user data retrieved');

            return res.data;
        }, { operationName: 'getInstagramUser' });
    }

    static async saveAccount(tenantId: string, igData: any, token: string) {
        const encrypted = encryptToken(token);

        const existingAccount = await prisma.iGAccount.findFirst({
            where: { tenantId },
        });

        if (existingAccount) {
            throw new Error('IG account already exists for this tenant');
        }

        const isIGAccountAlreadyConnected = await prisma.iGAccount.findFirst({
            where: { igUserId: igData.user_id, tenantId: { not: tenantId } },
        });

        if (isIGAccountAlreadyConnected) {
            throw new Error('IG account already connected to another tenant');
        }

        const account = await prisma.iGAccount.create({
            data: {
                tenantId,
                igUserId: igData.user_id,
                igBusinessId: igData.id,
                igUsername: igData.username,
                igName: igData.name,
                tokenCiphertext: Buffer.from(encrypted.encryptedToken, 'base64'),
                tokenKeyBlob: Buffer.from(encrypted.keyBlob),
                tokenNonce: encrypted.nonce,
                tokenAuthTag: Buffer.from(encrypted.tag, 'base64'),
            },
        })

        return account;

    }

    // Helper for auto-token refresh
    static async executeWithTokenRefresh<T>(
        igAccountId: string,
        token: string,
        apiCall: (token: string) => Promise<T>
    ): Promise<T> {
        try {
            return await apiCall(token);
        } catch (error: any) {
            if (this.isTokenExpiredError(error)) {
                logger.warn('Instagram token expired, attempting refresh...');
                const newToken = await this.refreshToken(token);
                if (newToken) {
                    await this.updateToken(igAccountId, newToken);
                    return await apiCall(newToken);
                }
            }
            throw error;
        }
    }

    private static isTokenExpiredError(error: any): boolean {
        const data = error?.response?.data?.error;
        if (!data) return false;
        return TOKEN_EXPIRED_CODES.includes(data.code) || TOKEN_EXPIRED_SUBCODES.includes(data.error_subcode);
    }

    private static async refreshToken(currentToken: string): Promise<string | null> {
        try {
            const url = 'https://graph.instagram.com/refresh_access_token';
            const res = await axios.get(url, {
                params: { grant_type: 'ig_refresh_token', access_token: currentToken },
            });
            return res.data.access_token;
        } catch (error) {
            logger.error({ err: error }, 'Failed to refresh Instagram token');
            return null;
        }
    }

    private static async updateToken(igAccountId: string, newToken: string): Promise<void> {
        const encrypted = encryptToken(newToken);
        await prisma.iGAccount.update({
            where: { id: igAccountId },
            data: {
                tokenCiphertext: Buffer.from(encrypted.encryptedToken, 'base64'),
                tokenKeyBlob: Buffer.from(encrypted.keyBlob),
                tokenNonce: encrypted.nonce,
                tokenAuthTag: Buffer.from(encrypted.tag, 'base64'),
            },
        });
    }

    static async getPosts(tenantId: string) {
        const account = await prisma.iGAccount.findFirst({
            where: { tenantId, isActive: true },
        });
        if (!account) throw new Error('No IG account connected');

        const token = decryptToken(account);
        const data = await this.executeWithTokenRefresh(account.id, token, async (t) => {
            const url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,like_count,comments_count,thumbnail_url,timestamp&access_token=${t}`;
            const res = await axios.get(url);
            return res.data;
        });

        return data.data;
    }

    static async getComments(tenantId: string, mediaId: string, limit: number = 25, after?: string) {
        const account = await prisma.iGAccount.findFirst({
            where: { tenantId, isActive: true },
        });
        if (!account) throw new Error('No IG account connected');

        const token = decryptToken(account);
        const accountUsername = account.igUsername || '';

        const data = await this.executeWithTokenRefresh(account.id, token, async (t) => {
            let url = `https://graph.instagram.com/${mediaId}/comments?fields=id,text,username,from,timestamp,replies{id,text,username,from,timestamp}&limit=${Math.min(limit, 100)}&access_token=${t}`;
            if (after) url += `&after=${after}`;
            const res = await axios.get(url);
            return res.data;
        });

        // Filtering logic (same as original but cleaned up)
        const replyIds = new Set<string>();
        data.data.forEach((comment: any) => {
            comment.replies?.data?.forEach((reply: any) => replyIds.add(reply.id));
        });

        const botReplyPatterns = ['Thanks! Please see DMs.', 'Sent you a message!', 'Check your DMs!'];
        const isBotReply = (comment: any) => {
            const username = comment.username || comment.from?.username || '';
            const text = comment.text || '';
            return (
                username.toLowerCase() === accountUsername.toLowerCase() &&
                botReplyPatterns.some((p) => text.toLowerCase().includes(p.toLowerCase()))
            );
        };

        const formatted = data.data
            .filter((c: any) => !replyIds.has(c.id) && !isBotReply(c))
            .map((c: any) => ({
                id: c.id,
                text: c.text,
                username: c.username || c.from?.username || 'Instagram User',
                timestamp: c.timestamp,
                replies: (c.replies?.data || []).map((r: any) => ({
                    id: r.id,
                    text: r.text,
                    username: r.username || r.from?.username || accountUsername,
                    timestamp: r.timestamp,
                })),
            }));

        return {
            comments: formatted,
            paging: {
                hasMore: !!data.paging?.cursors?.after,
                nextCursor: data.paging?.cursors?.after || null,
            },
        };
    }

    static async subscribeToComments(tenantId: string) {
        const account = await prisma.iGAccount.findFirst({
            where: { tenantId, isActive: true },
        });
        if (!account) throw new Error('No active IG account');

        const token = decryptToken(account);
        const url = `https://graph.instagram.com/v24.0/${account.igUserId}/subscribed_apps?subscribed_fields=comments&access_token=${token}`;
        await axios.post(url);
    }

    static async disconnect(tenantId: string) {
        return prisma.iGAccount.updateMany({
            where: { tenantId },
            data: { isActive: false },
        });
    }

    static async verifyConnection(tenantId: string) {
        const acc = await prisma.iGAccount.findFirst({
            where: { tenantId, isActive: true },
        });
        return { connected: !!acc, account: acc };
    }
}
