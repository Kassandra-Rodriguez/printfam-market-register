import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { toCsv } from "@/lib/csv";
import type { Database } from "@/types/database.types";

type Variant = Database["public"]["Tables"]["inventory_item_variants"]["Row"];

export async function GET() {
  const context = await getCurrentBusinessContext();
  if (!context || context.membership.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createClient();
  const [{ data: items }, { data: variants }] = await Promise.all([
    supabase
      .from("inventory_items")
      .select("*")
      .eq("business_id", context.business.id)
      .order("name", { ascending: true }),
    supabase.from("inventory_item_variants").select("*").eq("business_id", context.business.id),
  ]);

  const variantsByItem = new Map<string, Variant[]>();
  for (const variant of variants ?? []) {
    const list = variantsByItem.get(variant.item_id);
    if (list) list.push(variant);
    else variantsByItem.set(variant.item_id, [variant]);
  }

  // One row per item, or one row per variant for items that have them --
  // otherwise a has_variants item would export with a misleading quantity of 0.
  const rows = (items ?? []).flatMap((item) => {
    if (!item.has_variants) return [item];
    return (variantsByItem.get(item.id) ?? []).map((variant) => ({
      ...item,
      color: variant.value,
      quantity: variant.quantity,
      price: variant.price,
    }));
  });

  const csv = toCsv(rows, [
    { key: "name", label: "Name" },
    { key: "category", label: "Type" },
    { key: "color", label: "Color" },
    { key: "sku", label: "SKU" },
    { key: "quantity", label: "Quantity" },
    { key: "price", label: "Price" },
    { key: "cost", label: "Cost" },
    { key: "low_stock_threshold", label: "Low Stock Threshold" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Created At" },
    { key: "updated_at", label: "Updated At" },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="inventory.csv"`,
    },
  });
}
