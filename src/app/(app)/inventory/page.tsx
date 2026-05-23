import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const stock = await prisma.stockLevel.findMany({
    orderBy: { product: { name: "asc" } },
    include: { product: true },
  });

  return (
    <>
      <PageHeader title="Inventory" description="Stock on hand" />
      <PageBody>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead className="text-right">Reorder at</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-zinc-500 py-12">
                      No stock data yet.
                    </TableCell>
                  </TableRow>
                )}
                {stock.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-zinc-500 font-mono text-xs">{s.product.sku}</TableCell>
                    <TableCell className="font-medium">{s.product.name}</TableCell>
                    <TableCell
                      className={"text-right " + (s.quantity <= s.reorderThreshold ? "text-red-600 font-semibold" : "")}
                    >
                      {s.quantity}
                    </TableCell>
                    <TableCell className="text-right text-zinc-500">{s.reorderThreshold}</TableCell>
                    <TableCell className="text-right">{money(s.product.unitPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
