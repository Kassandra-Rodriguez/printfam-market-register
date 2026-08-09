import { notFound, redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { Activity } from "lucide-react";
import type { ActivityActionType } from "@/types/database.types";

function describe(actionType: ActivityActionType, metadata: Record<string, unknown>, currency: string): string {
  switch (actionType) {
    case "sale_completed":
      return `Recorded a sale of ${formatCurrency(Number(metadata.total ?? 0), currency)}`;
    case "sale_voided":
      return `Voided a transaction${metadata.reason ? `: ${metadata.reason}` : ""}`;
    case "inventory_adjusted":
      return `Adjusted inventory (${metadata.adjustment_type}), ${
        Number(metadata.delta) >= 0 ? "+" : ""
      }${metadata.delta}`;
    case "item_created":
      return `Added item "${metadata.name}"`;
    case "item_updated":
      return `Updated item "${metadata.name}"`;
    case "item_archived":
      return `Archived item "${metadata.name}"`;
    case "event_created":
      return `Created event "${metadata.name}"`;
    case "event_started":
      return "Started an event";
    case "event_closed":
      return "Closed an event";
    case "event_reopened":
      return "Reopened an event";
    case "cash_count_recorded":
      return `Recorded a cash count (difference ${formatCurrency(Number(metadata.difference ?? 0), currency)})`;
    case "employee_joined":
      return "Joined the business";
    case "employee_invited":
      return `Invited ${metadata.email}`;
    default:
      return actionType.replaceAll("_", " ");
  }
}

export default async function EmployeeActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");
  if (context.membership.role !== "owner") redirect("/more");

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("business_members")
    .select("user_id, profiles(full_name)")
    .eq("id", id)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (!member) notFound();
  const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("business_id", context.business.id)
    .eq("actor_id", member.user_id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <PageHeader title={`${profile?.full_name ?? "Employee"} activity`} backHref="/more/employees" />

      {!logs || logs.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" description="Actions this person takes will show up here." />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {logs.map((log) => (
            <div key={log.id} className="px-4 py-3">
              <p className="text-sm">
                {describe(log.action_type, log.metadata, context.business.default_currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
