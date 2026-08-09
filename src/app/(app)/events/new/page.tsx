import { redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { PageHeader } from "@/components/shared/page-header";
import { CreateEventForm } from "@/components/events/create-event-form";

export default async function NewEventPage() {
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");

  const canManage = context.membership.role === "owner" || context.settings.employees_can_manage_events;
  if (!canManage) redirect("/events");

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <PageHeader title="New event" backHref="/events" />
      <CreateEventForm />
    </div>
  );
}
