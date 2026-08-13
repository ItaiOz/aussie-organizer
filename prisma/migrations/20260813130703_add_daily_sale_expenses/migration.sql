-- CreateTable
CREATE TABLE "DailySaleExpense" (
    "id" TEXT NOT NULL,
    "dailySaleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "DailySaleExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailySaleExpense_dailySaleId_idx" ON "DailySaleExpense"("dailySaleId");

-- AddForeignKey
ALTER TABLE "DailySaleExpense" ADD CONSTRAINT "DailySaleExpense_dailySaleId_fkey" FOREIGN KEY ("dailySaleId") REFERENCES "DailySale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
