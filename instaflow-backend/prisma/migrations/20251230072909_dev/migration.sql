-- AlterTable
ALTER TABLE "Automation" ADD COLUMN     "automationEndTime" TIMESTAMP(3),
ADD COLUMN     "automationStartTime" TIMESTAMP(3),
ADD COLUMN     "isAutomationTimingEnabled" BOOLEAN NOT NULL DEFAULT false;
