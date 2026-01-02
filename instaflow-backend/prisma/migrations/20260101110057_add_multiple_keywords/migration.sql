/*
  Warnings:

  - You are about to drop the column `triggerKeyword` on the `Automation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Automation" DROP COLUMN "triggerKeyword",
ADD COLUMN     "triggerKeywords" TEXT[];
