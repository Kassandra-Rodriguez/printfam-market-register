import { notFound, redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { ItemActions } from "@/components/inventory/item-actions";
import { VariantManager } from "@/components/inventory/variant-manager";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { Package } from "lucide-react";
import type { Database } from "@/types/database.types";

export default async function InventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", id)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (!item) notFound();

  const [{ data: profiles }, { data: variants }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", Array.from(new Set([item.created_by, item.updated_by]))),
    item.has_variants
      ? supabase
          .from("inventory_item_variants")
          .select("*")
          .eq("item_id", item.id)
          .order("value", { ascending: true })
      : Promise.resolve({ data: [] as Database["public"]["Tables"]["inventory_item_variants"]["Row"][] }),
  ]);

  const createdByName = profiles?.find((p) => p.id === item.created_by)?.full_name;
  const updatedByName = profiles?.find((p) => p.id === item.updated_by)?.full_name;

  const isOwner = context.membership.role === "owner";
  const canAdjust = isOwner || context.settings.employees_can_adjust_inventory;
  const quantity = item.has_variants
    ? (variants ?? []).reduce((sum, v) => sum + v.quantity, 0)
    : item.quantity;
  const isLow = item.low_stock_threshold != null && quantity <= item.low_stock_threshold;

  const priceDisplay = (() => {
    if (!item.has_variants) return formatCurrency(item.price, context.business.default_currency);
    const prices = (variants ?? []).map((v) => v.price);
    if (prices.length === 0) return formatCurrency(item.price, context.business.default_currency);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max
      ? formatCurrency(min, context.business.default_currency)
      : `${formatCurrency(min, context.business.default_currency)}–${formatCurrency(max, context.business.default_currency)}`;
  })();

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <PageHeader title={item.name} backHref="/inventory" />

      <div className="mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-muted">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt="" className="size-full object-cover" />
        ) : (
          <Package className="size-10 text-muted-foreground" />
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{item.category}</Badge>
        {item.color && (
          <Badge variant="outline" className="capitalize">
            {item.color}
          </Badge>
        )}
        {item.status === "archived" && <Badge variant="destructive">Archived</Badge>}
        {isLow && item.status === "active" && (
          <Badge className="bg-warning/15 text-warning-foreground dark:text-warning">
            Low stock
          </Badge>
        )}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Price</p>
          <p className="font-semibold">{priceDisplay}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Cost</p>
          <p className="font-semibold">{formatCurrency(item.cost, context.business.default_currency)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">In stock</p>
          <p className="font-semibold">{quantity}</p>
        </div>
      </div>

      {item.description && (
        <p className="mb-4 text-sm text-muted-foreground">{item.description}</p>
      )}

      {item.has_variants && (
        <VariantManager
          itemId={item.id}
          variants={variants ?? []}
          currency={context.business.default_currency}
          isOwner={isOwner}
          canAdjust={canAdjust}
          isArchived={item.status === "archived"}
        />
      )}

      <div className="mb-6">
        <ItemActions
          itemId={item.id}
          isOwner={isOwner}
          canAdjust={canAdjust}
          isArchived={item.status === "archived"}
          hasVariants={item.has_variants}
        />
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        {item.sku && <p>SKU: {item.sku}</p>}
        <p>
          Added {format(new Date(item.created_at), "MMM d, yyyy")}
          {createdByName ? ` by ${createdByName}` : ""}
        </p>
        <p>
          Updated {format(new Date(item.updated_at), "MMM d, yyyy")}
          {updatedByName ? ` by ${updatedByName}` : ""}
        </p>
      </div>
    </div>
  );
}
