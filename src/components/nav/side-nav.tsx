"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FULL_NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useBusiness } from "@/components/providers/business-provider";
import { Store } from "lucide-react";

export function SideNav() {
  const pathname = usePathname();
  const { business, isOwner } = useBusiness();
  const items = FULL_NAV_ITEMS.filter((item) => item.href !== "/reports" || isOwner);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card md:flex">
      <div className="flex h-16 min-w-0 items-center gap-2 border-b px-5">
        {business.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logo_url}
            alt=""
            className="size-8 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Store className="size-4" />
          </span>
        )}
        <span className="min-w-0 truncate font-semibold">{business.name}</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
