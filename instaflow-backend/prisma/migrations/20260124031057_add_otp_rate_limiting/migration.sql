-- AlterTable
ALTER TABLE "User" ADD COLUMN     "otpRateLimitCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "otpRateLimitReset" TIMESTAMP(3);
