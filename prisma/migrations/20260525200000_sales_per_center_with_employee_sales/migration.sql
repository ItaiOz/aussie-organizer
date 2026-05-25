-- Switch DailySale to one-row-per-center-per-day, drop employee/type, add card/refund.
-- Create EmployeeSale for per-salesperson amounts attached to a DailySale.

ALTER TABLE "DailySale" DROP CONSTRAINT IF EXISTS "DailySale_employeeId_fkey";

DROP INDEX IF EXISTS "DailySale_employeeId_date_idx";
DROP INDEX IF EXISTS "DailySale_centerId_date_idx";

ALTER TABLE "DailySale" DROP COLUMN IF EXISTS "type";
ALTER TABLE "DailySale" DROP COLUMN IF EXISTS "employeeId";
ALTER TABLE "DailySale" DROP COLUMN IF EXISTS "creditAmount";

ALTER TABLE "DailySale" ADD COLUMN "cardAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "DailySale" ADD COLUMN "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "DailySale" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "DailySale" ADD CONSTRAINT "DailySale_centerId_date_key" UNIQUE ("centerId", "date");

CREATE TABLE "EmployeeSale" (
  "id" TEXT NOT NULL,
  "dailySaleId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "EmployeeSale_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmployeeSale_employeeId_idx" ON "EmployeeSale" ("employeeId");
CREATE INDEX "EmployeeSale_dailySaleId_idx" ON "EmployeeSale" ("dailySaleId");

ALTER TABLE "EmployeeSale" ADD CONSTRAINT "EmployeeSale_dailySaleId_fkey"
  FOREIGN KEY ("dailySaleId") REFERENCES "DailySale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeSale" ADD CONSTRAINT "EmployeeSale_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
