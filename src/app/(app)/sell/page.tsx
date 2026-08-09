import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { SellView } from "@/components/sell/sell-view";
import { EmptyState } from "@/components/shared/empty-state";
import { LiveRefresh } from "@/components/shared/live-refresh";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";

export default async function SellPage() {
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");

  const supabase = await createClient();

  const [{ data: activeEvent }, { data: items }, { data: variants }, { data: paymentMethods }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, name")
        .eq("business_id", context.business.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("inventory_items")
        .select("*")
        .eq("business_id", context.business.id)
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase.from("inventory_item_variants").select("*").eq("business_id", context.business.id),
      supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order"),
    ]);

  if (!activeEvent) {
    const canManage = context.membership.role === "owner" || context.settings.employees_can_manage_events;
    return (
      <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
        <LiveRefresh businessId={context.business.id} tables={["events"]} />
        <h1 className="mb-4 text-xl font-semibold tracking-tight">Sell</h1>
        <EmptyState
          icon={CalendarPlus}
          title="No active event"
          description="Start an event before recording sales so they're grouped together for your recap."
          action={
            canManage ? (
              <Button className="mt-2" size="sm" render={<Link href="/events" />}>
                Go to events
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 md:py-6">
      <LiveRefresh businessId={context.business.id} tables={["events"]} />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="shrink-0 text-xl font-semibold tracking-tight">Sell</h1>
        <Link
          href={`/events/${activeEvent.id}`}
          className="min-w-0 truncate text-sm text-muted-foreground underline underline-offset-4"
        >
          {activeEvent.name}
        </Link>
      </div>
      <SellView
        initialItems={items ?? []}
        initialVariants={variants ?? []}
        eventId={activeEvent.id}
        businessId={context.business.id}
        paymentMethods={paymentMethods ?? []}
        currency={context.business.default_currency}
        allowNegativeInventory={context.settings.allow_negative_inventory}
      />
    </div>
  );
}
