import { Router } from 'express';
import { AutomationController } from '../controllers/automation.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
    createAutomationSchema,
    updateAutomationSchema,
    deleteAutomationSchema
} from '../schema/automation.schema';

const router = Router();

router.post('/', authMiddleware, validate(createAutomationSchema), AutomationController.createAutomation);
router.get('/', authMiddleware, AutomationController.listAutomations);
router.get('/activity-logs', authMiddleware, AutomationController.getActivityLogs);
router.put('/:automationId', authMiddleware, validate(updateAutomationSchema), AutomationController.updateAutomation);
router.delete('/:automationId', authMiddleware, validate(deleteAutomationSchema), AutomationController.deleteAutomation);

export default router;
