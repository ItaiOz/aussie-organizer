import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="min-h-dvh bg-zinc-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-4 h-14">
        <div>
          <span className="font-semibold text-zinc-900">Aussie Organizer</span>
          <span className="ml-2 text-xs text-zinc-500">Daily sales</span>
        </div>
        <form action="/api/signout" method="post">
          <button className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-700 hover:bg-zinc-100">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-2xl p-4 md:p-8">{children}</main>
    </div>
  );
}
