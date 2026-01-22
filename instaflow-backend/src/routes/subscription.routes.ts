import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { checkoutSchema } from '../schema/subscription.schema';

const router = Router();

router.get('/plans', SubscriptionController.getPlans);
router.get('/current', authMiddleware, SubscriptionController.getCurrent);
router.post('/checkout', authMiddleware, validate(checkoutSchema), SubscriptionController.checkout);
router.post('/webhook', SubscriptionController.webhook);

export default router;
