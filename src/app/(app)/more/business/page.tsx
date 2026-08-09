import { redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { BusinessProfileForm } from "@/components/settings/business-profile-form";
import { BusinessPermissionsForm } from "@/components/settings/business-permissions-form";
import { PageHeader } from "@/components/shared/page-header";

export default async function BusinessSettingsPage() {
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");
  if (context.membership.role !== "owner") redirect("/more");

  const { business, settings } = context;

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <PageHeader title="Business settings" backHref="/more" />

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Business profile</h2>
        <BusinessProfileForm
          businessId={business.id}
          name={business.name}
          email={business.email}
          phone={business.phone}
          timezone={business.timezone}
          logoUrl={business.logo_url}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Employee permissions</h2>
        <BusinessPermissionsForm
          initial={{
            allowNegativeInventory: settings.allow_negative_inventory,
            employeesCanAdjustInventory: settings.employees_can_adjust_inventory,
            employeesCanVoidOwnRecentTransactions:
              settings.employees_can_void_own_recent_transactions,
            employeesCanManageEvents: settings.employees_can_manage_events,
            voidWindowMinutes: settings.void_window_minutes,
          }}
        />
      </section>
    </div>
  );
}
