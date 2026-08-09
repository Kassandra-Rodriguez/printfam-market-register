import Link from "next/link";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  UserRound,
  Store,
  Users,
  ChevronRight,
  LogOut,
  BarChart3,
  Tags,
} from "lucide-react";

function Row({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 active:bg-muted"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
        <Icon className="size-4.5" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

export default async function MorePage() {
  const context = await getCurrentBusinessContext();
  const isOwner = context?.membership.role === "owner";

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">More</h1>

      <div className="mb-6 divide-y overflow-hidden rounded-xl border bg-card">
        {isOwner && (
        <Link href="/reports" className="flex items-center gap-3 px-4 py-3.5 active:bg-muted md:hidden">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <BarChart3 className="size-4.5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium">Reports</span>
            <span className="block truncate text-xs text-muted-foreground">
              Sales totals, best sellers, exports
            </span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        )}
        <Row
          href="/more/profile"
          icon={UserRound}
          label="Profile settings"
          description="Your name, phone, and photo"
        />
        {isOwner && (
          <>
            <Row
              href="/more/business"
              icon={Store}
              label="Business settings"
              description="Business profile and permissions"
            />
            <Row
              href="/more/employees"
              icon={Users}
              label="Employees"
              description="Invite and manage your team"
            />
            <Row
              href="/more/categories"
              icon={Tags}
              label="Categories"
              description="Rename or remove product categories"
            />
          </>
        )}
      </div>

      <form action={logout}>
        <Button type="submit" variant="outline" className="w-full">
          <LogOut /> Log out
        </Button>
      </form>
    </div>
  );
}
