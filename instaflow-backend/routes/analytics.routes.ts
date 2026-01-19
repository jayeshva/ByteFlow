import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { prisma } from "../prisma";
import crypto from "crypto";

const router = Router();

/**
 * Public redirect endpoint - tracks click and redirects to destination
 * URL format: /api/r/:trackingId
 * trackingId format: automationId:buttonId (base64 encoded)
 */
router.get("/r/:trackingId", async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    // Decode tracking ID
    const decoded = Buffer.from(trackingId, "base64url").toString("utf-8");
    const [automationId, buttonId] = decoded.split(":");
    
    if (!automationId || !buttonId) {
      return res.status(400).json({ message: "Invalid tracking ID" });
    }

    // Find the automation and get the button URL
    const automation = await prisma.automation.findUnique({
      where: { id: automationId },
      select: { 
        id: true, 
        tenantId: true, 
        ctaButtons: true 
      }
    });

    if (!automation) {
      return res.status(404).json({ message: "Link not found" });
    }

    // Parse buttons and find the target URL
    const buttons = (automation.ctaButtons as any[]) || [];
    const button = buttons.find((b: any) => b.id === buttonId);
    
    if (!button || !button.url) {
      return res.status(404).json({ message: "Button not found" });
    }

    // Log the click event
    const ipHash = crypto
      .createHash("sha256")
      .update(req.ip || "unknown")
      .digest("hex")
      .slice(0, 16);

    await prisma.clickEvent.create({
      data: {
        automationId: automation.id,
        buttonId,
        tenantId: automation.tenantId,
        userAgent: req.headers["user-agent"] || null,
        referer: req.headers["referer"] || null,
        ipHash
      }
    });

    // Redirect to the destination URL
    res.redirect(302, button.url);
  } catch (err: any) {
    console.error("Click tracking error:", err);
    res.status(500).json({ message: "Redirect failed" });
  }
});

/**
 * Get analytics for a specific automation
 */
router.get("/analytics/automation/:automationId", authMiddleware, async (req: any, res) => {
  try {
    const { automationId } = req.params;

    // Verify ownership
    const automation = await prisma.automation.findFirst({
      where: { 
        id: automationId, 
        tenantId: req.user.tenantId,
        isDeleted: false
      },
      select: {
        id: true,
        flowName: true,
        executionCount: true,
        ctaButtons: true,
        createdAt: true
      }
    });

    if (!automation) {
      return res.status(404).json({ message: "Automation not found" });
    }

    // Get click counts per button
    const clickCounts = await prisma.clickEvent.groupBy({
      by: ["buttonId"],
      where: { automationId },
      _count: { id: true }
    });

    // Get total clicks
    const totalClicks = await prisma.clickEvent.count({
      where: { automationId }
    });

    // Get clicks over time (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const clicksOverTime = await prisma.clickEvent.groupBy({
      by: ["clickedAt"],
      where: {
        automationId,
        clickedAt: { gte: sevenDaysAgo }
      },
      _count: { id: true },
      orderBy: { clickedAt: "asc" }
    });

    // Map button clicks
    const buttons = (automation.ctaButtons as any[]) || [];
    const buttonAnalytics = buttons.map((btn: any) => {
      const count = clickCounts.find(c => c.buttonId === btn.id)?._count?.id || 0;
      return {
        id: btn.id,
        label: btn.label,
        url: btn.url,
        clicks: count,
        ctr: automation.executionCount > 0 
          ? ((count / automation.executionCount) * 100).toFixed(1) 
          : "0.0"
      };
    });

    res.json({
      automationId: automation.id,
      flowName: automation.flowName,
      executionCount: automation.executionCount,
      totalClicks,
      ctr: automation.executionCount > 0 
        ? ((totalClicks / automation.executionCount) * 100).toFixed(1) 
        : "0.0",
      buttons: buttonAnalytics,
      clicksOverTime: clicksOverTime.map(c => ({
        date: c.clickedAt,
        clicks: c._count.id
      })),
      createdAt: automation.createdAt
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get analytics overview for all automations
 */
router.get("/analytics/overview", authMiddleware, async (req: any, res) => {
  try {
    const tenantId = req.user.tenantId;

    // Get all automations with their stats
    const automations = await prisma.automation.findMany({
      where: { tenantId, isDeleted: false },
      select: {
        id: true,
        flowName: true,
        executionCount: true,
        isEnabled: true,
        scopeMediaId: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    // Get click counts per automation
    const clickCounts = await prisma.clickEvent.groupBy({
      by: ["automationId"],
      where: { tenantId },
      _count: { id: true }
    });

    const clickMap = new Map(clickCounts.map(c => [c.automationId, c._count.id]));

    // Calculate totals
    const totalExecutions = automations.reduce((sum, a) => sum + a.executionCount, 0);
    const totalClicks = Array.from(clickMap.values()).reduce((sum, c) => sum + c, 0);

    const automationStats = automations.map(a => ({
      id: a.id,
      flowName: a.flowName || "Unnamed Flow",
      executionCount: a.executionCount,
      clicks: clickMap.get(a.id) || 0,
      ctr: a.executionCount > 0 
        ? (((clickMap.get(a.id) || 0) / a.executionCount) * 100).toFixed(1)
        : "0.0",
      isEnabled: a.isEnabled,
      scopeMediaId: a.scopeMediaId,
      createdAt: a.createdAt
    }));

    res.json({
      totalAutomations: automations.length,
      activeAutomations: automations.filter(a => a.isEnabled).length,
      totalExecutions,
      totalClicks,
      overallCtr: totalExecutions > 0 
        ? ((totalClicks / totalExecutions) * 100).toFixed(1)
        : "0.0",
      automations: automationStats
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
