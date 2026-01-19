import { prisma } from "../prisma";
import { AutomationService } from "../services/automation.service";
import { AutomationRequest } from "../types";

export class AutomationController {
  static async createAutomation(req: any, res: any) {
    try {
      const createReq: AutomationRequest = {
        scopeType: req.body.scopeType,
        scopeMediaId: req.body.scopeMediaId,
        automationType: req.body.automationType,
        matchType: req.body.matchType,
        triggerKeyword: req.body.triggerKeyword,
        intentLabel: req.body.intentLabel,
        flowName: req.body.flowName,
        enablePublicReply: req.body.enablePublicReply,
        publicReplyText: req.body.publicReplyText,
        privateReplyText: req.body.privateReplyText,
        isAutomationTimingEnabled: req.body.isAutomationTimingEnabled || false,
        automationStartTime: req.body.automationStartTime,
        automationEndTime: req.body.automationEndTime,
        // Require Follow feature
        requireFollow: req.body.requireFollow || false,
        followPromptText: req.body.followPromptText,
        // CTA Buttons
        ctaButtons: req.body.ctaButtons || [],
      };


      // Validate POST scope
      if (createReq.scopeType === "POST" && !createReq.scopeMediaId) {
        return res
          .status(400)
          .json({ message: "scopeMediaId required when scopeType=POST" });
      }

      const igAccount = await prisma.iGAccount.findFirst({
        where: { tenantId: req.user.tenantId, isActive: true },
      });

      if (!igAccount) {
        return res.status(404).json({ message: "Instagram account not found" });
      }

    //   console.log("createReq:", createReq);
      //   console.log("body:", req.body);

      const automation = await AutomationService.createAutomation(
        createReq,
        req.user.tenantId,
        igAccount.id
      );

      res.json({ message: "Automation created", automation });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }
  static async listAutomations(req: any, res: any) {
    try {
      const igAccount = await prisma.iGAccount.findFirst({
        where: { tenantId: req.user.tenantId, isActive: true },
      });

      if (!igAccount) {
        return res.status(404).json({ message: "Instagram account not found" });
      }

      const automations = await AutomationService.listAutomations(
        req.user.tenantId
      );
      res.json(automations);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async updateAutomation(req: any, res: any) {
    try {
      const igAccount = await prisma.iGAccount.findFirst({
        where: { tenantId: req.user.tenantId, isActive: true },
      });

      if (!igAccount) {
        return res.status(404).json({ message: "Instagram account not found" });
      }
      const automationId = req.params.automationId;
      const updateData: Partial<AutomationRequest> = req.body;

      const updatedAutomation = await AutomationService.updateAutomation(
        automationId,
        updateData
      );
      res.json({
        message: "Automation updated",
        automation: updatedAutomation,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async deleteAutomation(req: any, res: any) {
    try {
      const igAccount = await prisma.iGAccount.findFirst({
        where: { tenantId: req.user.tenantId, isActive: true },
      });

      if (!igAccount) {
        return res.status(404).json({ message: "Instagram account not found" });
      }
      const automationId = req.params.automationId;
      await AutomationService.deleteAutomation(automationId);
      res.json({ message: "Automation deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async getActivityLogs(req: any, res: any) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const cursor = req.query.cursor ? BigInt(req.query.cursor) : undefined;

      const logs = await prisma.messageLog.findMany({
        where: { tenantId: req.user.tenantId },
        orderBy: { createdAt: "desc" },
        take: limit + 1, // Fetch one extra to check if there are more
        ...(cursor && {
          cursor: { id: cursor },
          skip: 1 // Skip the cursor item itself
        }),
        include: {
          tenant: true
        }
      });

      // Get automation details for matched rules
      const automationIds = [...new Set(logs.filter(l => l.matchedRuleId).map(l => l.matchedRuleId))];
      const automations = await prisma.automation.findMany({
        where: { id: { in: automationIds as string[] } },
        select: { id: true, flowName: true }
      });
      const automationMap = new Map(automations.map(a => [a.id, a.flowName]));

      // Map to ActivityLog format
      const activityLogs = logs.map(log => {
        let action = "Skipped";
        if (log.status === "SENT") action = "Sent DM";
        else if (log.status === "FAILED") action = "Failed";
        else if (log.errorCode === "RATE_LIMIT") action = "Rate Limited";

        // Format timestamp
        const timestamp = new Date(log.createdAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });

        // Get flowName from matched automation
        const flowName = log.matchedRuleId ? automationMap.get(log.matchedRuleId) : null;

        return {
          id: log.id.toString(),
          username: log.senderUsername || log.senderId?.slice(-8) || "Unknown",
          comment: log.commentText || (log.commentId ? `Comment #${log.commentId.slice(-6)}` : "N/A"),
          action,
          timestamp,
          status: log.status,
          errorCode: log.errorCode,
          flowName: flowName || "Unknown Flow",
          mediaId: log.mediaId,
          sentiment: "neutral" // Required by ActivityLog type
        };
      });

      // Check if there are more results
      const hasMore = logs.length > limit;
      const displayLogs = hasMore ? activityLogs.slice(0, -1) : activityLogs;
      const nextCursor = hasMore && logs.length > 0 
        ? logs[logs.length - 2].id.toString() 
        : null;

      res.json({
        logs: displayLogs,
        hasMore,
        nextCursor
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }
}
