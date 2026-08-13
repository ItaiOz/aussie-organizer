// One-time fix: entry dates were stored as local (Israel) midnight = 21:00 UTC
// of the previous day. Shift them +3h to UTC midnight so day-bucketing works
// the same in dev and on Vercel. Only touches rows whose time is exactly 21:00.
//
// Usage: node scripts/fix-dates.js
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const [sales, expenses] = await p.$transaction([
    p.$executeRawUnsafe(
      `UPDATE "DailySale" SET date = date + interval '3 hours' WHERE date::time = '21:00:00'`
    ),
    p.$executeRawUnsafe(
      `UPDATE "Expense" SET "datePaid" = "datePaid" + interval '3 hours' WHERE "datePaid"::time = '21:00:00'`
    ),
  ]);
  console.log(`DailySale rows fixed: ${sales} | Expense rows fixed: ${expenses}`);
  const sample = await p.dailySale.findMany({ select: { date: true }, orderBy: { date: "desc" }, take: 3 });
  console.log("sample dates now:", sample.map((r) => r.date.toISOString()).join(", "));
  await p.$disconnect();
})();
