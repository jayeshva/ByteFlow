/*
  Warnings:

  - You are about to drop the `Rule` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `automationType` to the `Automation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matchType` to the `Automation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `privateReplyText` to the `Automation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `triggerType` to the `Automation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Rule" DROP CONSTRAINT "Rule_automationId_fkey";

-- AlterTable
ALTER TABLE "Automation" ADD COLUMN     "automationType" TEXT NOT NULL,
ADD COLUMN     "cooldownSec" INTEGER NOT NULL DEFAULT 3600,
ADD COLUMN     "enablePublicReply" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "intentLabel" TEXT,
ADD COLUMN     "matchType" TEXT NOT NULL,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "privateReplyText" TEXT NOT NULL,
ADD COLUMN     "publicReplyText" TEXT,
ADD COLUMN     "rules" JSONB DEFAULT '[]',
ADD COLUMN     "triggerKeyword" TEXT,
ADD COLUMN     "triggerType" TEXT NOT NULL;

-- DropTable
DROP TABLE "Rule";

-- CreateIndex
CREATE INDEX "Automation_igAccountId_isEnabled_priority_idx" ON "Automation"("igAccountId", "isEnabled", "priority");
