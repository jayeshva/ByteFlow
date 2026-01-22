import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/error.middleware';
import logger from './utils/logger';
import { config } from './config';

import authRoutes from './routes/auth.routes';
import instagramRoutes from './routes/instagram.routes';
import automationRoutes from './routes/automation.routes';
import analyticsRoutes from './routes/analytics.routes';
import subscriptionRoutes from './routes/subscription.routes';
import webhookRoutes from './routes/webhook.routes';

const app = express();

// Trust the first proxy (e.g., Cloud Run load balancer) for accurate IP detection in rate limiting
// app.set('trust proxy', 1);

// const globalLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100, // Limit each IP to 100 requests per windowMs
//     standardHeaders: true,
//     legacyHeaders: false,
//     message: { error: 'Too many requests, please try again later.' }
// });

// Security Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
// app.use(globalLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging
// app.use((req, res, next) => {
//     logger.info(`${req.method} ${req.url}`);
//     next();
// });

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/instagram', instagramRoutes);
app.use('/automate', automationRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/subscription', subscriptionRoutes);
app.use('/webhook', webhookRoutes);

// Error Handling
app.use(errorHandler);

export default app;
