import { redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { CategoryManager } from "@/components/inventory/category-manager";

export default async function CategoriesPage() {
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");
  if (context.membership.role !== "owner") redirect("/more");

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("inventory_items")
    .select("category")
    .eq("business_id", context.business.id);

  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    if (!row.category) continue;
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  }
  const categories = Array.from(counts.entries())
    .map(([name, itemCount]) => ({ name, itemCount }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <PageHeader title="Categories" backHref="/more" />
      <CategoryManager categories={categories} />
    </div>
  );
}
