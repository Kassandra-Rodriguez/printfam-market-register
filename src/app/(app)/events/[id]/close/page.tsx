import { notFound, redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { getRecap } from "@/lib/recap";
import { PageHeader } from "@/components/shared/page-header";
import { RecapStats } from "@/components/shared/recap-stats";
import { CloseEventForm } from "@/components/events/close-event-form";

export default async function CloseEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");

  const canManage = context.membership.role === "owner" || context.settings.employees_can_manage_events;
  if (!canManage) redirect(`/events/${id}`);

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, name, status")
    .eq("id", id)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (!event) notFound();
  if (event.status !== "active") redirect(`/events/${id}`);

  const recap = await getRecap({ businessId: context.business.id, eventId: id });

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <PageHeader title={`Close ${event.name}`} backHref={`/events/${id}`} />
      <div className="mb-6">
        <RecapStats recap={recap} currency={context.business.default_currency} />
      </div>
      <CloseEventForm
        eventId={id}
        recordedCashSales={recap.paymentTotals.cash}
        currency={context.business.default_currency}
      />
    </div>
  );
}
