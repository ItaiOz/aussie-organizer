import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { money, fmtDate } from "@/lib/format";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ExpenseFormDialog } from "./expense-form-dialog";
import { DeleteExpenseButton } from "./delete-expense-button";
import { EXPENSE_CATEGORIES } from "./categories";

export const dynamic = "force-dynamic";

type ExpenseRow = {
  id: string;
  title: string;
  amount: number;
  category: string;
  paidBy: string;
  datePaid: Date;
  notes: string | null;
};

function ExpenseTable({ rows, showCategory }: { rows: ExpenseRow[]; showCategory: boolean }) {
  const cols = showCategory ? 7 : 6;
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date paid</TableHead>
              <TableHead>Title</TableHead>
              {showCategory && <TableHead>Category</TableHead>}
              <TableHead>Paid by</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={cols} className="text-center text-zinc-500 py-12">
                  No expenses yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-zinc-600 whitespace-nowrap">{fmtDate(e.datePaid)}</TableCell>
                <TableCell className="font-medium">{e.title}</TableCell>
                {showCategory && <TableCell className="text-zinc-600">{e.category}</TableCell>}
                <TableCell className="text-zinc-600">{e.paidBy}</TableCell>
                <TableCell className="text-right font-semibold">{money(e.amount)}</TableCell>
                <TableCell className="text-zinc-500 text-sm">{e.notes ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <ExpenseFormDialog
                    expense={{
                      id: e.id,
                      title: e.title,
                      amount: e.amount,
                      category: e.category,
                      paidBy: e.paidBy,
                      datePaid: format(e.datePaid, "yyyy-MM-dd"),
                      notes: e.notes,
                    }}
                  />
                  <DeleteExpenseButton id={e.id} title={e.title} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({
    orderBy: [{ datePaid: "desc" }, { createdAt: "desc" }],
  });

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Include any categories present in data but no longer in the fixed list
  const categories = [
    ...EXPENSE_CATEGORIES,
    ...Array.from(new Set(expenses.map((e) => e.category))).filter(
      (c) => !(EXPENSE_CATEGORIES as readonly string[]).includes(c)
    ),
  ];

  const totals = categories.map((cat) => {
    const rows = expenses.filter((e) => e.category === cat);
    return {
      cat,
      thisMonth: rows.filter((e) => e.datePaid >= thisMonthStart).reduce((s, e) => s + e.amount, 0),
      lastMonth: rows
        .filter((e) => e.datePaid >= lastMonthStart && e.datePaid <= lastMonthEnd)
        .reduce((s, e) => s + e.amount, 0),
      allTime: rows.reduce((s, e) => s + e.amount, 0),
    };
  });
  const grand = {
    thisMonth: totals.reduce((s, t) => s + t.thisMonth, 0),
    lastMonth: totals.reduce((s, t) => s + t.lastMonth, 0),
    allTime: totals.reduce((s, t) => s + t.allTime, 0),
  };

  return (
    <>
      <PageHeader title="Expenses" description="Business expenses by category (AUD)" action={<ExpenseFormDialog />} />
      <PageBody>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Totals by category</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">This month</TableHead>
                  <TableHead className="text-right">Last month</TableHead>
                  <TableHead className="text-right">All time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totals.map((t) => (
                  <TableRow key={t.cat}>
                    <TableCell className="font-medium">{t.cat}</TableCell>
                    <TableCell className="text-right">
                      {t.thisMonth === 0 ? <span className="text-zinc-300">—</span> : money(t.thisMonth)}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.lastMonth === 0 ? <span className="text-zinc-300">—</span> : money(t.lastMonth)}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.allTime === 0 ? <span className="text-zinc-300">—</span> : money(t.allTime)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold">{money(grand.thisMonth)}</TableCell>
                  <TableCell className="text-right font-semibold">{money(grand.lastMonth)}</TableCell>
                  <TableCell className="text-right font-semibold">{money(grand.allTime)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Tabs defaultValue="all">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map((c) => (
              <TabsTrigger key={c} value={c}>
                {c}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="all">
            <ExpenseTable rows={expenses} showCategory />
          </TabsContent>
          {categories.map((c) => (
            <TabsContent key={c} value={c}>
              <ExpenseTable rows={expenses.filter((e) => e.category === c)} showCategory={false} />
            </TabsContent>
          ))}
        </Tabs>
      </PageBody>
    </>
  );
}
