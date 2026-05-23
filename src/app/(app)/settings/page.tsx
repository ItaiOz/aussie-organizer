import { PageHeader, PageBody } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <PageBody>
        <ComingSoon description="User management, business preferences, currency, timezone." />
      </PageBody>
    </>
  );
}
