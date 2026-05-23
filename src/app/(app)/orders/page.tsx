import { PageHeader, PageBody } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function OrdersPage() {
  return (
    <>
      <PageHeader title="Orders" description="Purchase orders to suppliers" />
      <PageBody>
        <ComingSoon description="Create POs, mark them received, and auto-update stock levels." />
      </PageBody>
    </>
  );
}
