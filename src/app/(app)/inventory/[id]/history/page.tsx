import { notFound, redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { History } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  stock_added: "Stock added",
  manual_correction: "Manual correction",
  damaged: "Damaged",
  lost: "Lost",
  returned: "Returned",
  other: "Other",
};

export default async function InventoryHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");
  if (context.membership.role !== "owner") redirect(`/inventory/${id}`);

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("inventory_items")
    .select("id, name")
    .eq("id", id)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (!item) notFound();

  const { data: adjustments } = await supabase
    .from("inventory_adjustments")
    .select("*, profiles(full_name)")
    .eq("inventory_item_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <PageHeader title={`${item.name} history`} backHref={`/inventory/${id}`} />

      {!adjustments || adjustments.length === 0 ? (
        <EmptyState
          icon={History}
          title="No adjustments yet"
          description="Stock added, corrections, and write-offs will show up here."
        />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {adjustments.map((adj) => {
            const profile = Array.isArray(adj.profiles) ? adj.profiles[0] : adj.profiles;
            const positive = adj.quantity_change >= 0;
            return (
              <div key={adj.id} className="flex flex-col gap-1 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary">{TYPE_LABELS[adj.adjustment_type] ?? adj.adjustment_type}</Badge>
                    {adj.variant_label && <Badge variant="outline">{adj.variant_label}</Badge>}
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      positive ? "text-success" : "text-destructive"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {adj.quantity_change}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {adj.previous_quantity} &rarr; {adj.new_quantity} · {profile?.full_name ?? "Unknown"} ·{" "}
                  {format(new Date(adj.created_at), "MMM d, yyyy h:mm a")}
                </p>
                {adj.note && <p className="text-sm">{adj.note}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
