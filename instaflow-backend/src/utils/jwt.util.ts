import jwt from 'jsonwebtoken';
import { config } from '../config';

export const generateAccessToken = (payload: object) => {
    return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '1d' });
};

export const generateRefreshToken = (payload: object) => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'refresh_secret', { expiresIn: '7d' });
};
