/*
  Warnings:

  - A unique constraint covering the columns `[igUserId]` on the table `IGAccount` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `igUserId` to the `IGAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "IGAccount" ADD COLUMN     "igUserId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "IGAccount_igUserId_key" ON "IGAccount"("igUserId");
