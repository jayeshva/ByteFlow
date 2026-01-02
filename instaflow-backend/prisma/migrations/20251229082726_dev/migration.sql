-- DropForeignKey
ALTER TABLE "Tenant" DROP CONSTRAINT "Tenant_planId_fkey";

-- AlterTable
ALTER TABLE "Tenant" ALTER COLUMN "planId" DROP NOT NULL,
ALTER COLUMN "planId" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
