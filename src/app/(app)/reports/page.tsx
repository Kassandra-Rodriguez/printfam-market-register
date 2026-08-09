import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { getRecap, getBestSellingItems, getSalesByEmployee } from "@/lib/recap";
import { resolveRange } from "@/lib/report-filters";
import { formatCurrency } from "@/lib/currency";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { RecapStats } from "@/components/shared/recap-stats";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { PaymentMethodCode } from "@/types/database.types";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");
  if (context.membership.role !== "owner") redirect("/home");

  const params = await searchParams;
  const { business } = context;
  const { from, to } = resolveRange(business.timezone, params.range, params.from, params.to);

  const filters = {
    businessId: business.id,
    from,
    to,
    eventId: params.event,
    employeeId: params.employee,
    paymentMethodCode: params.payment as PaymentMethodCode | undefined,
  };

  const supabase = await createClient();
  const [{ data: events }, { data: members }, recap, bestSellers, byEmployee] = await Promise.all([
    supabase.from("events").select("id, name").eq("business_id", business.id).order("event_date", { ascending: false }),
    supabase
      .from("business_members")
      .select("user_id, profiles(full_name)")
      .eq("business_id", business.id)
      .eq("status", "active"),
    getRecap(filters),
    getBestSellingItems(filters),
    getSalesByEmployee(filters),
  ]);

  const employees = (members ?? []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return { id: m.user_id, name: profile?.full_name ?? "Unknown" };
  });

  const exportQuery = new URLSearchParams();
  if (params.range) exportQuery.set("range", params.range);
  if (params.from) exportQuery.set("from", params.from);
  if (params.to) exportQuery.set("to", params.to);
  if (params.event) exportQuery.set("event", params.event);
  if (params.employee) exportQuery.set("employee", params.employee);
  if (params.payment) exportQuery.set("payment", params.payment);

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 md:py-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Reports</h1>

      <div className="mb-4">
        <ReportFilterBar events={events ?? []} employees={employees} />
      </div>

      <div className="mb-4">
        <RecapStats recap={recap} currency={business.default_currency} />
      </div>

      <div className="mb-4">
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Best sellers</h2>
        {bestSellers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales in this range.</p>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border bg-card">
            {bestSellers.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 truncate">{item.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {item.quantity} sold · {formatCurrency(item.revenue, business.default_currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Sales by employee</h2>
        {byEmployee.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales in this range.</p>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border bg-card">
            {byEmployee.map((row) => (
              <div key={row.employeeId} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 truncate">{row.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {row.count} sales · {formatCurrency(row.total, business.default_currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="outline"
          className="h-10"
          render={<Link href={`/api/export/transactions?${exportQuery.toString()}`} />}
        >
          <Download /> Export transactions CSV
        </Button>
        <Button variant="outline" className="h-10" render={<Link href="/api/export/inventory" />}>
          <Download /> Export inventory CSV
        </Button>
      </div>
    </div>
  );
}
