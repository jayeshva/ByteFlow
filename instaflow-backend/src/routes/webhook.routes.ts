import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

router.get('/instagram', WebhookController.verify);
router.post('/instagram', WebhookController.handleWebhook);

export default router;
