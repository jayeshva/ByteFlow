import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

router.get('/instagram', WebhookController.verify);
router.post('/instagram', WebhookController.handleWebhook);
router.post('/instagram/deauthorize', WebhookController.handleDeauthorization);
router.post('/instagram/data-deletion', WebhookController.handleDataDeletion);

export default router;
