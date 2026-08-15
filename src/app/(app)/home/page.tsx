import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { getRecap } from "@/lib/recap";
import { todayRange } from "@/lib/dates";
import { formatCurrency } from "@/lib/currency";
import { StatTile } from "@/components/dashboard/stat-tile";
import { RecentSalesList, type RecentSale } from "@/components/dashboard/recent-sales-list";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { LiveRefresh } from "@/components/shared/live-refresh";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  Package,
  AlertTriangle,
  CalendarPlus,
  PackagePlus,
  Banknote,
  Smartphone,
  CreditCard,
  Boxes,
} from "lucide-react";

const PAYMENT_LABELS: Record<string, string> = { cash: "Cash", cashapp: "Cash App", card: "Card" };

export default async function HomePage() {
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");

  const supabase = await createClient();
  const { business, settings } = context;
  const canManageEvents = context.membership.role === "owner" || settings.employees_can_manage_events;
  const isOwner = context.membership.role === "owner";

  const [{ data: activeEvent }, { data: items }, { data: recentTx }, { data: paymentMethods }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, name")
        .eq("business_id", business.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("inventory_items")
        .select("quantity, low_stock_threshold")
        .eq("business_id", business.id)
        .eq("status", "active"),
      supabase
        .from("transactions")
        .select("id, total, occurred_at, employee_id, payment_method_id")
        .eq("business_id", business.id)
        .eq("status", "completed")
        .order("occurred_at", { ascending: false })
        .limit(5),
      supabase.from("payment_methods").select("id, code"),
      supabase.from("profiles").select("id, full_name, email"),
    ]);

  const recentTxIds = (recentTx ?? []).map((t) => t.id);
  const { data: recentTxItems } = recentTxIds.length
    ? await supabase
        .from("transaction_items")
        .select("transaction_id, item_name, quantity")
        .in("transaction_id", recentTxIds)
    : { data: [] };

  const itemsSummaryByTx = new Map<string, string>();
  for (const line of recentTxItems ?? []) {
    const label = `${line.quantity}x ${line.item_name}`;
    itemsSummaryByTx.set(
      line.transaction_id,
      itemsSummaryByTx.has(line.transaction_id)
        ? `${itemsSummaryByTx.get(line.transaction_id)}, ${label}`
        : label
    );
  }

  const { from, to } = todayRange(business.timezone);
  const todayRecap = await getRecap({ businessId: business.id, from, to });

  const totalInventory = (items ?? []).reduce((sum, i) => sum + i.quantity, 0);
  const lowStockCount = (items ?? []).filter(
    (i) => i.low_stock_threshold != null && i.quantity <= i.low_stock_threshold
  ).length;

  const codeById = new Map((paymentMethods ?? []).map((pm) => [pm.id, pm.code]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const recentSales: RecentSale[] = (recentTx ?? []).map((t) => {
    const profile = profileById.get(t.employee_id);
    return {
      id: t.id,
      total: t.total,
      occurred_at: t.occurred_at,
      employeeName: profile?.full_name || profile?.email || "Unknown",
      paymentLabel: PAYMENT_LABELS[codeById.get(t.payment_method_id) ?? ""] ?? "",
      itemsSummary: itemsSummaryByTx.get(t.id) ?? "",
    };
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 md:py-6">
      <LiveRefresh businessId={business.id} tables={["transactions", "events"]} />
      <h1 className="mb-4 text-xl font-semibold tracking-tight">{business.name}</h1>

      <div className="mb-4 rounded-xl border bg-card p-4">
        {activeEvent ? (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Active event</p>
              <Link
                href={`/events/${activeEvent.id}`}
                className="block truncate font-medium underline underline-offset-4"
              >
                {activeEvent.name}
              </Link>
            </div>
            <EventStatusBadge status="active" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">No active event</p>
              <p className="text-xs text-muted-foreground">Start one before you begin selling.</p>
            </div>
            {canManageEvents && (
              <Button size="sm" render={<Link href="/events" />}>
                <CalendarPlus /> Events
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Button size="lg" className="h-16 flex-col gap-1" render={<Link href="/sell" />}>
          <ShoppingBag className="size-5" />
          Sell
        </Button>
        {canManageEvents && (
          <Button
            size="lg"
            variant="outline"
            className="h-16 flex-col gap-1"
            render={<Link href="/events/new" />}
          >
            <CalendarPlus className="size-5" />
            New event
          </Button>
        )}
        {isOwner && (
          <Button
            size="lg"
            variant="outline"
            className="h-16 flex-col gap-1"
            render={<Link href="/inventory/new" />}
          >
            <PackagePlus className="size-5" />
            Add item
          </Button>
        )}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Today</h2>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Sales today" value={formatCurrency(todayRecap.grossSales, business.default_currency)} />
        <StatTile label="Items sold" value={String(todayRecap.itemsSold)} icon={Boxes} />
        <StatTile
          label="Cash"
          value={formatCurrency(todayRecap.paymentTotals.cash, business.default_currency)}
          icon={Banknote}
        />
        <StatTile
          label="Cash App"
          value={formatCurrency(todayRecap.paymentTotals.cashapp, business.default_currency)}
          icon={Smartphone}
        />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          label="Card"
          value={formatCurrency(todayRecap.paymentTotals.card, business.default_currency)}
          icon={CreditCard}
        />
        <StatTile label="In stock" value={String(totalInventory)} icon={Package} />
        <StatTile
          label="Low stock items"
          value={String(lowStockCount)}
          icon={AlertTriangle}
          tone={lowStockCount > 0 ? "warning" : "default"}
        />
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Recent sales</h2>
        <Link href="/transactions" className="text-xs text-muted-foreground underline underline-offset-4">
          View all
        </Link>
      </div>
      <RecentSalesList sales={recentSales} currency={business.default_currency} />
    </div>
  );
}
