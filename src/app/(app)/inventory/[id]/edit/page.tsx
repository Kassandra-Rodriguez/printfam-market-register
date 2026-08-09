import { notFound, redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { InventoryItemForm } from "@/components/inventory/inventory-item-form";

export default async function EditInventoryItemPage({
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
    .select("*")
    .eq("id", id)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (!item) notFound();

  const { data: rows } = await supabase
    .from("inventory_items")
    .select("category")
    .eq("business_id", context.business.id);
  const categories = Array.from(new Set((rows ?? []).map((r) => r.category).filter(Boolean))).sort();

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <PageHeader title="Edit item" backHref={`/inventory/${id}`} />
      <InventoryItemForm
        mode="edit"
        itemId={item.id}
        businessId={context.business.id}
        categories={categories}
        defaultValues={{
          name: item.name,
          category: item.category,
          color: item.color,
          sku: item.sku ?? "",
          description: item.description ?? "",
          imageUrl: item.image_url,
          quantity: item.quantity,
          cost: item.cost,
          price: item.price,
          lowStockThreshold: item.low_stock_threshold,
        }}
      />
    </div>
  );
}
