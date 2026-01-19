-- AlterTable
ALTER TABLE "Automation" ADD COLUMN     "followPromptText" TEXT,
ADD COLUMN     "requireFollow" BOOLEAN NOT NULL DEFAULT false;
