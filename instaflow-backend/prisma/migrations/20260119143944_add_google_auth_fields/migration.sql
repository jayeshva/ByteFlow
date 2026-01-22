/*
  Warnings:

  - A unique constraint covering the columns `[cashfreeSubscriptionId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Automation" ADD COLUMN     "publicReplies" JSONB DEFAULT '[]',
ADD COLUMN     "triggerKeywords" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "cashfreeCustomerId" TEXT,
ADD COLUMN     "cashfreeSubscriptionId" TEXT,
ADD COLUMN     "paymentProvider" TEXT NOT NULL DEFAULT 'dodo';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "googleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_cashfreeSubscriptionId_key" ON "Subscription"("cashfreeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_cashfreeSubscriptionId_idx" ON "Subscription"("cashfreeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
