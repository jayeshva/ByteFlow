import { Request, Response } from 'express';
import { InstagramService } from '../services/instagram.service';
import { prisma } from '../prisma';
import { decryptToken } from '../utils/crypto.util';

export class InstagramController {
    static async loginUrl(req: Request, res: Response) {
        const tenantId = (req as any).user.tenantId;
        const url = InstagramService.getLoginUrl(tenantId);
        res.status(200).json({ success: true, data: { url } });
    }

    static async callback(req: Request, res: Response) {
        const { code, state } = req.query;
        const tenantId = state as string;

        const short = await InstagramService.exchangeCodeForToken(code as string);
        const long = await InstagramService.getLongLivedToken(short.access_token);
        const igUser = await InstagramService.getInstagramUser(long.access_token);

        const account = await InstagramService.saveAccount(tenantId, igUser, long.access_token);

        if (req.query.popup === '1') {
            return res.status(200).json({
                success: true,
                data: {
                    igUserId: account.igUserId,
                    igBusinessId: account.igBusinessId,
                    igUsername: account.igUsername,
                },
            });
        }

        const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(redirectUrl);
    }

    static async disconnect(req: Request, res: Response) {
        const tenantId = (req as any).user.tenantId;
        await InstagramService.disconnect(tenantId);
        res.status(200).json({ success: true, message: 'Instagram disconnected' });
    }

    static async verify(req: Request, res: Response) {
        const tenantId = (req as any).user.tenantId;
        const result = await InstagramService.verifyConnection(tenantId);
        res.status(200).json({ success: true, data: result });
    }

    static async getComments(req: Request, res: Response) {
        const tenantId = (req as any).user.tenantId;
        const { mediaId } = req.params;
        const { limit, after } = req.query;
        const result = await InstagramService.getComments(tenantId, mediaId, Number(limit) || 25, after as string);
        // Prevent browser caching for fresh comments
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.status(200).json({ success: true, data: result });
    }

    static async subscribeToComments(req: Request, res: Response) {
        const tenantId = (req as any).user.tenantId;
        await InstagramService.subscribeToComments(tenantId);
        res.status(200).json({ success: true, message: 'Subscribed to comments successfully' });
    }

    static async getPosts(req: Request, res: Response) {
        const tenantId = (req as any).user.tenantId;
        const posts = await InstagramService.getPosts(tenantId);
        // Prevent browser caching for fresh posts
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.status(200).json({ success: true, data: posts });
    }

    static async getProfile(req: Request, res: Response) {
        const tenantId = (req as any).user.tenantId;
        const userId = (req as any).user.userId;

        const account = await prisma.iGAccount.findFirst({
            where: { tenantId, isActive: true },
        });

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!account) {
            return res.status(200).json({
                success: true,
                data: {
                    isIGconnected: false,
                    userFullName: user?.name,
                    userEmail: user?.email,
                },
            });
        }

        const token = decryptToken(account);
        const profile = await InstagramService.getInstagramUser(token);

        res.status(200).json({
            success: true,
            data: {
                ...profile,
                isIGconnected: true,
                userFullName: user?.name,
                userEmail: user?.email,
            },
        });
    }
}
