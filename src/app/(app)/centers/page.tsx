import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/page-header";
import { NewCenterButton } from "./center-dialog";
import { KanbanBoard } from "./kanban-board";

export const dynamic = "force-dynamic";

export default async function CentersPage() {
  const centers = await prisma.shoppingCenter.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  const cards = centers.map((c) => ({
    id: c.id,
    name: c.name,
    region: c.region,
    contactName: c.contactName,
    notes: c.notes,
    bookedFrom: c.bookedFrom ? c.bookedFrom.toISOString() : null,
    bookedTo: c.bookedTo ? c.bookedTo.toISOString() : null,
    status: c.status,
  }));

  return (
    <>
      <PageHeader
        title="Shopping centers"
        description="Leasing pipeline — drag cards between columns, or tap a card to edit"
        action={<NewCenterButton />}
      />
      <PageBody>
        <KanbanBoard initial={cards} />
      </PageBody>
    </>
  );
}
