import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { getRecap } from "@/lib/recap";
import { PageHeader } from "@/components/shared/page-header";
import { RecapStats } from "@/components/shared/recap-stats";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { EventActions } from "@/components/events/event-actions";
import { LiveRefresh } from "@/components/shared/live-refresh";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { format, parseISO } from "date-fns";
import { CalendarDays, Clock, MapPin, Receipt } from "lucide-react";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (!event) notFound();

  const canManage = context.membership.role === "owner" || context.settings.employees_can_manage_events;
  const recap = await getRecap({ businessId: context.business.id, eventId: event.id });

  const { data: cashCounts } = await supabase
    .from("cash_counts")
    .select("*")
    .eq("event_id", event.id)
    .order("counted_at", { ascending: false })
    .limit(1);
  const latestCashCount = cashCounts?.[0];

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <LiveRefresh businessId={context.business.id} tables={["transactions", "events", "cash_counts"]} />
      <PageHeader title={event.name} backHref="/events" action={<EventStatusBadge status={event.status} />} />

      <div className="mb-4 space-y-1.5 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <CalendarDays className="size-4" />
          {format(parseISO(event.event_date), "EEEE, MMMM d, yyyy")}
        </p>
        {(event.start_time || event.end_time) && (
          <p className="flex items-center gap-2">
            <Clock className="size-4" />
            {event.start_time?.slice(0, 5)}
            {event.end_time ? ` – ${event.end_time.slice(0, 5)}` : ""}
          </p>
        )}
        {event.location && (
          <p className="flex items-center gap-2">
            <MapPin className="size-4" />
            {event.location}
          </p>
        )}
      </div>

      {event.notes && <p className="mb-4 text-sm">{event.notes}</p>}

      <div className="mb-4">
        <EventActions eventId={event.id} status={event.status} canManage={canManage} />
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Recap</h2>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={`/transactions?event=${event.id}`} />}
          >
            <Receipt /> Transactions
          </Button>
        </div>
        <RecapStats recap={recap} currency={context.business.default_currency} />
      </div>

      {latestCashCount && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Cash count</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>
              Expected:{" "}
              <span className="font-medium">
                {formatCurrency(latestCashCount.expected_cash, context.business.default_currency)}
              </span>
            </p>
            <p>
              Actual:{" "}
              <span className="font-medium">
                {formatCurrency(latestCashCount.actual_cash, context.business.default_currency)}
              </span>
            </p>
            <p className="col-span-2">
              Difference:{" "}
              <span
                className={
                  latestCashCount.difference === 0
                    ? "font-medium"
                    : latestCashCount.difference > 0
                      ? "font-medium text-success"
                      : "font-medium text-destructive"
                }
              >
                {formatCurrency(latestCashCount.difference, context.business.default_currency)}
              </span>
            </p>
          </div>
          {latestCashCount.note && (
            <p className="mt-2 text-sm text-muted-foreground">{latestCashCount.note}</p>
          )}
        </div>
      )}
    </div>
  );
}
