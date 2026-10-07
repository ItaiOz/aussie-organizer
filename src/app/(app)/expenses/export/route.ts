import ExcelJS from "exceljs";
import { format } from "date-fns";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role === "staff") return new Response("Unauthorized", { status: 401 });

  const expenses = await prisma.expense.findMany({
    orderBy: [{ datePaid: "desc" }, { createdAt: "desc" }],
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Expenses", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Date paid", key: "datePaid", width: 12, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Title", key: "title", width: 32 },
    { header: "Category", key: "category", width: 16 },
    { header: "Paid by", key: "paidBy", width: 18 },
    { header: "Amount (AUD)", key: "amount", width: 14, style: { numFmt: '"$"#,##0.00' } },
    { header: "Notes", key: "notes", width: 40 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const e of expenses) {
    ws.addRow({
      datePaid: e.datePaid,
      title: e.title,
      category: e.category,
      paidBy: e.paidBy,
      amount: e.amount,
      notes: e.notes ?? "",
    });
  }

  const totalRow = ws.addRow({
    title: "Total",
    amount: { formula: `SUM(E2:E${expenses.length + 1})`, result: expenses.reduce((s, e) => s + e.amount, 0) },
  });
  totalRow.font = { bold: true };
  ws.autoFilter = { from: "A1", to: `F${expenses.length + 1}` };

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="expenses-${format(new Date(), "yyyy-MM-dd")}.xlsx"`,
    },
  });
}
