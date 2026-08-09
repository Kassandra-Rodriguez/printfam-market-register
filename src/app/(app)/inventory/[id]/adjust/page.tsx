import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { AdjustInventoryForm } from "@/components/inventory/adjust-inventory-form";
import { Badge } from "@/components/ui/badge";

export default async function AdjustInventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ variant?: string }>;
}) {
  const { id } = await params;
  const { variant: variantId } = await searchParams;
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");

  const canAdjust = context.membership.role === "owner" || context.settings.employees_can_adjust_inventory;
  if (!canAdjust) redirect(`/inventory/${id}`);

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("inventory_items")
    .select("id, name, quantity, status, has_variants")
    .eq("id", id)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (!item || item.status !== "active") notFound();

  if (!item.has_variants) {
    return (
      <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
        <PageHeader title="Adjust quantity" backHref={`/inventory/${id}`} />
        <AdjustInventoryForm itemId={item.id} itemName={item.name} currentQuantity={item.quantity} />
      </div>
    );
  }

  if (!variantId) {
    const { data: variants } = await supabase
      .from("inventory_item_variants")
      .select("*")
      .eq("item_id", item.id)
      .order("value", { ascending: true });

    return (
      <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
        <PageHeader title="Adjust quantity" backHref={`/inventory/${id}`} />
        <p className="mb-3 text-sm text-muted-foreground">Choose which variant to adjust.</p>
        <div className="flex flex-col gap-2">
          {(variants ?? []).map((v) => (
            <Link
              key={v.id}
              href={`/inventory/${id}/adjust?variant=${v.id}`}
              className="flex items-center justify-between rounded-lg border bg-card p-3 active:bg-muted"
            >
              <span className="text-sm font-medium">{v.value}</span>
              <Badge variant="secondary">{v.quantity} left</Badge>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const { data: variant } = await supabase
    .from("inventory_item_variants")
    .select("*")
    .eq("id", variantId)
    .eq("item_id", item.id)
    .maybeSingle();

  if (!variant) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <PageHeader title="Adjust quantity" backHref={`/inventory/${id}`} />
      <AdjustInventoryForm
        itemId={item.id}
        itemName={`${item.name} — ${variant.value}`}
        currentQuantity={variant.quantity}
        variantId={variant.id}
      />
    </div>
  );
}
