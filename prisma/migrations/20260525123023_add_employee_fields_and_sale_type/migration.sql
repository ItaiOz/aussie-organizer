-- DropForeignKey
ALTER TABLE "DailySale" DROP CONSTRAINT "DailySale_employeeId_fkey";

-- DropIndex
DROP INDEX "DailySale_employeeId_date_key";

-- AlterTable
ALTER TABLE "DailySale" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'sale',
ALTER COLUMN "employeeId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "payout" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'employee';

-- CreateIndex
CREATE INDEX "DailySale_employeeId_date_idx" ON "DailySale"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "DailySale" ADD CONSTRAINT "DailySale_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
