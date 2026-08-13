"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  Receipt,
  Wallet,
  Banknote,
  Home,
  Package,
  ShoppingCart,
  Truck,
  Settings,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/centers", label: "Shopping centers", icon: Building2 },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/sales", label: "Sales", icon: Receipt },
  { href: "/payroll", label: "Weekly payroll", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: Banknote },
  { href: "/apartments", label: "Apartments", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function SignOut() {
  return (
    <form action="/api/signout" method="post" className="p-3 border-t border-zinc-200">
      <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-700 hover:bg-zinc-100">
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </form>
  );
}

export function AppShell({ username, children }: { username: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Close the drawer whenever navigation happens
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-dvh flex-col">
      {/* Top bar: always on mobile; on md+ only when the sidebar is collapsed */}
      <header
        className={cn(
          "flex items-center justify-between border-b border-zinc-200 bg-white px-4 h-14 shrink-0",
          collapsed ? "" : "md:hidden"
        )}
      >
        <div className="font-semibold text-zinc-900">Aussie Organizer</div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-2 -mr-2 rounded-md text-zinc-700 hover:bg-zinc-100"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <div>
                <div className="font-semibold text-zinc-900">Aussie Organizer</div>
                <div className="text-xs text-zinc-500 mt-0.5">Signed in as {username}</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="p-2 -mr-2 rounded-md text-zinc-700 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
              <NavLinks pathname={pathname} />
            </nav>
            <SignOut />
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className={cn("hidden w-60 shrink-0 border-r border-zinc-200 bg-white flex-col", !collapsed && "md:flex")}>
          <div className="px-6 py-5 border-b border-zinc-200 flex items-start justify-between">
          <div>
            <div className="font-semibold text-zinc-900">Aussie Organizer</div>
            <div className="text-xs text-zinc-500 mt-0.5">Signed in as {username}</div>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            aria-label="Hide menu"
            className="p-1.5 -mr-2 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            <NavLinks pathname={pathname} />
          </nav>
          <SignOut />
        </aside>

        <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
