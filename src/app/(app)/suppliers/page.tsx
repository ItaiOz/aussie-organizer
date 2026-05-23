import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true, orders: true } } },
  });

  return (
    <>
      <PageHeader title="Suppliers" description="Who you order from" />
      <PageBody>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-zinc-500 py-12">
                      No suppliers yet.
                    </TableCell>
                  </TableRow>
                )}
                {suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-zinc-600">{s.contactPerson ?? "—"}</TableCell>
                    <TableCell className="text-zinc-600">{s.phone ?? "—"}</TableCell>
                    <TableCell className="text-zinc-600">{s.email ?? "—"}</TableCell>
                    <TableCell className="text-right">{s._count.products}</TableCell>
                    <TableCell className="text-right">{s._count.orders}</TableCell>
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
