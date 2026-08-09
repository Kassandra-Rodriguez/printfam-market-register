import { redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { AddItemWizard } from "@/components/inventory/add-item-wizard";

export default async function NewInventoryItemPage() {
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");
  if (context.membership.role !== "owner") redirect("/inventory");

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("inventory_items")
    .select("category")
    .eq("business_id", context.business.id);
  const categories = Array.from(new Set((rows ?? []).map((r) => r.category).filter(Boolean))).sort();

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <PageHeader title="Add item" backHref="/inventory" />
      <AddItemWizard businessId={context.business.id} categories={categories} />
    </div>
  );
}
