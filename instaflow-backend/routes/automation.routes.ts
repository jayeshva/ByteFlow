import { Router } from "express";
import {authMiddleware} from "../middleware/auth.middleware";
import { AutomationController } from "../controllers/automation.controller";


const router = Router();

router.post("/", authMiddleware, AutomationController.createAutomation);
router.get("/", authMiddleware, AutomationController.listAutomations);
router.get("/activity-logs", authMiddleware, AutomationController.getActivityLogs);
router.put("/:automationId", authMiddleware, AutomationController.updateAutomation);
router.delete("/:automationId", authMiddleware, AutomationController.deleteAutomation);


export default router;