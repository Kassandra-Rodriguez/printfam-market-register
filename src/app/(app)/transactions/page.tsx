import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { Receipt } from "lucide-react";

const PAYMENT_LABELS: Record<string, string> = { cash: "Cash", cashapp: "Cash App", card: "Card" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { event: eventId } = await searchParams;
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");

  const supabase = await createClient();

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("business_id", context.business.id)
    .order("occurred_at", { ascending: false })
    .limit(100);

  if (eventId) query = query.eq("event_id", eventId);

  const [{ data: transactions }, { data: paymentMethods }, { data: profiles }] = await Promise.all([
    query,
    supabase.from("payment_methods").select("id, code"),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const codeById = new Map((paymentMethods ?? []).map((pm) => [pm.id, pm.code]));
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <PageHeader title="Transactions" backHref={eventId ? `/events/${eventId}` : undefined} />

      {!transactions || transactions.length === 0 ? (
        <EmptyState icon={Receipt} title="No transactions yet" description="Sales you record will show up here." />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {transactions.map((t) => (
            <Link
              key={t.id}
              href={`/transactions/${t.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 active:bg-muted"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {nameById.get(t.employee_id) ?? "Unknown"}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {PAYMENT_LABELS[codeById.get(t.payment_method_id) ?? ""] ?? ""}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(t.occurred_at), "MMM d, h:mm a")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`font-semibold tabular-nums ${t.status === "voided" ? "text-muted-foreground line-through" : ""}`}
                >
                  {formatCurrency(t.total, context.business.default_currency)}
                </span>
                {t.status === "voided" && <Badge variant="destructive">Voided</Badge>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
