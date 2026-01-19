-- AlterTable
ALTER TABLE "Automation" ADD COLUMN     "ctaButtons" JSONB DEFAULT '[]',
ADD COLUMN     "executionCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ClickEvent" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "buttonId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "referer" TEXT,
    "ipHash" TEXT,

    CONSTRAINT "ClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClickEvent_automationId_clickedAt_idx" ON "ClickEvent"("automationId", "clickedAt");

-- CreateIndex
CREATE INDEX "ClickEvent_tenantId_clickedAt_idx" ON "ClickEvent"("tenantId", "clickedAt");

-- AddForeignKey
ALTER TABLE "ClickEvent" ADD CONSTRAINT "ClickEvent_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
