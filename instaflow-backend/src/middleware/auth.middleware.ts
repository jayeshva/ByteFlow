import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import logger from '../utils/logger';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, error: 'Missing token' });
    }

    try {
        const decoded: any = jwt.verify(token, config.JWT_SECRET);
        (req as any).user = decoded;
        next();
    } catch (err) {
        logger.warn({ err }, 'Invalid token attempt');
        res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
};
