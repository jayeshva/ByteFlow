/*
  Warnings:

  - You are about to drop the column `triggerKeywords` on the `Automation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Automation" DROP COLUMN "triggerKeywords",
ADD COLUMN     "triggerKeyword" TEXT;
