import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { CalendarDays, MapPin, Plus } from "lucide-react";

const STATUS_RANK = { active: 0, upcoming: 1, closed: 2 } as const;

export default async function EventsPage() {
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");

  const canManage = context.membership.role === "owner" || context.settings.employees_can_manage_events;

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("business_id", context.business.id)
    .order("event_date", { ascending: false });

  const sorted = (events ?? []).sort((a, b) => {
    const rankDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rankDiff !== 0) return rankDiff;
    return a.status === "upcoming"
      ? a.event_date.localeCompare(b.event_date)
      : b.event_date.localeCompare(a.event_date);
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Events</h1>
        {canManage && (
          <Button size="sm" render={<Link href="/events/new" />}>
            <Plus /> New event
          </Button>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events yet"
          description="Create an event before you start selling at a market or pop-up."
          action={
            canManage ? (
              <Button className="mt-2" size="sm" render={<Link href="/events/new" />}>
                Create your first event
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="flex flex-col gap-1.5 rounded-xl border bg-card p-4 active:bg-muted"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate font-medium">{event.name}</p>
                <EventStatusBadge status={event.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3.5" />
                  {format(parseISO(event.event_date), "EEE, MMM d, yyyy")}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {event.location}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
