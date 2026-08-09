import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { InventoryListView } from "@/components/inventory/inventory-list-view";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function InventoryPage() {
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");

  const supabase = await createClient();
  const [{ data: items }, { data: variants }] = await Promise.all([
    supabase
      .from("inventory_items")
      .select("*")
      .eq("business_id", context.business.id)
      .order("name", { ascending: true }),
    supabase
      .from("inventory_item_variants")
      .select("*")
      .eq("business_id", context.business.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 md:py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Inventory</h1>
        {context.membership.role === "owner" && (
          <Button size="sm" render={<Link href="/inventory/new" />}>
            <Plus /> Add item
          </Button>
        )}
      </div>
      <InventoryListView
        items={items ?? []}
        variants={variants ?? []}
        currency={context.business.default_currency}
        businessId={context.business.id}
        isOwner={context.membership.role === "owner"}
      />
    </div>
  );
}
