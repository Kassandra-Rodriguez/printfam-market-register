import { redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { PageHeader } from "@/components/shared/page-header";
import { AddItemWizard } from "@/components/inventory/add-item-wizard";

export default async function NewInventoryItemPage() {
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");
  if (context.membership.role !== "owner") redirect("/inventory");

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <PageHeader title="Add item" backHref="/inventory" />
      <AddItemWizard businessId={context.business.id} />
    </div>
  );
}
