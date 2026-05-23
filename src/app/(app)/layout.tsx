import { auth } from "../../../auth";
import { Sidebar } from "@/components/sidebar";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="flex h-screen">
      <Sidebar username={session.user.name ?? "user"} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
