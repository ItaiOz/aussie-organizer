"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  Receipt,
  Wallet,
  Home,
  Package,
  ShoppingCart,
  Truck,
  Settings,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/centers", label: "Shopping centers", icon: Building2 },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/sales", label: "Sales", icon: Receipt },
  { href: "/payroll", label: "Weekly payroll", icon: Wallet },
  { href: "/apartments", label: "Apartments", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ username }: { username: string }) {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-zinc-200 bg-white flex flex-col">
      <div className="px-6 py-5 border-b border-zinc-200">
        <div className="font-semibold text-zinc-900">Aussie Organizer</div>
        <div className="text-xs text-zinc-500 mt-0.5">Signed in as {username}</div>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
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
      </nav>
      <form action="/api/signout" method="post" className="p-3 border-t border-zinc-200">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-700 hover:bg-zinc-100">
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </form>
    </aside>
  );
}
