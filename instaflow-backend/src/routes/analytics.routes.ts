import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { trackClickSchema, getAutomationAnalyticsSchema } from '../schema/analytics.schema';

const router = Router();

router.get('/r/:trackingId', validate(trackClickSchema), AnalyticsController.redirect);
router.get('/automation/:automationId', authMiddleware, validate(getAutomationAnalyticsSchema), AnalyticsController.getAutomationAnalytics);
router.get('/overview', authMiddleware, AnalyticsController.getOverview);

export default router;
