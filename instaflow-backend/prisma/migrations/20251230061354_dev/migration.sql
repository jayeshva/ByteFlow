/*
  Warnings:

  - You are about to drop the column `igBusinessId` on the `Automation` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Automation_tenantId_igBusinessId_isEnabled_idx";

-- AlterTable
ALTER TABLE "Automation" DROP COLUMN "igBusinessId";

-- CreateIndex
CREATE INDEX "Automation_tenantId_isEnabled_idx" ON "Automation"("tenantId", "isEnabled");
