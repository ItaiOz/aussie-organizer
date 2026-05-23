import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money, fmtDate } from "@/lib/format";
import { ApartmentFormDialog } from "./apartment-form-dialog";
import { AssignButton } from "./assign-button";

export const dynamic = "force-dynamic";

export default async function ApartmentsPage() {
  const [apartments, employees] = await Promise.all([
    prisma.apartment.findMany({
      orderBy: { address: "asc" },
      include: {
        assignments: {
          where: { moveOutDate: null },
          include: { employee: true },
        },
      },
    }),
    prisma.employee.findMany({
      where: { status: "active" },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Apartments"
        description="Employee housing"
        action={<ApartmentFormDialog />}
      />
      <PageBody>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {apartments.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-zinc-500">
                No apartments yet.
              </CardContent>
            </Card>
          )}
          {apartments.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-zinc-900">{a.address}</div>
                    <div className="text-sm text-zinc-500">
                      {a.city ?? ""} · {a.bedrooms} bedroom{a.bedrooms === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{money(a.monthlyRent)}/mo</div>
                    {a.landlord && <div className="text-xs text-zinc-500">{a.landlord}</div>}
                  </div>
                </div>
                <div className="text-xs text-zinc-500 mb-2">
                  Lease: {fmtDate(a.leaseStart)} – {a.leaseEnd ? fmtDate(a.leaseEnd) : "ongoing"}
                </div>
                <div className="border-t border-zinc-100 pt-3 mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Living here ({a.assignments.length})
                    </div>
                    <AssignButton apartmentId={a.id} employees={employees.map((e) => ({ id: e.id, fullName: e.fullName }))} />
                  </div>
                  {a.assignments.length === 0 ? (
                    <div className="text-sm text-zinc-400">No current occupants.</div>
                  ) : (
                    <ul className="space-y-1">
                      {a.assignments.map((as) => (
                        <li key={as.id} className="text-sm flex items-center justify-between">
                          <span>{as.employee.fullName}</span>
                          <span className="text-xs text-zinc-500">since {fmtDate(as.moveInDate)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageBody>
    </>
  );
}
