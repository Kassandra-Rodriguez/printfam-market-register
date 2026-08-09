import { notFound, redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { VoidTransactionDialog } from "@/components/transactions/void-transaction-dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";

const PAYMENT_LABELS: Record<string, string> = { cash: "Cash", cashapp: "Cash App", card: "Card" };

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");

  const supabase = await createClient();
  const { data: transaction } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (!transaction) notFound();

  const [{ data: items }, { data: employee }, { data: paymentMethod }, { data: voidedByProfile }] =
    await Promise.all([
      supabase.from("transaction_items").select("*").eq("transaction_id", id),
      supabase.from("profiles").select("full_name").eq("id", transaction.employee_id).single(),
      supabase.from("payment_methods").select("code, label").eq("id", transaction.payment_method_id).single(),
      transaction.voided_by
        ? supabase.from("profiles").select("full_name").eq("id", transaction.voided_by).single()
        : Promise.resolve({ data: null }),
    ]);

  const isOwner = context.membership.role === "owner";
  const withinWindow =
    new Date().getTime() - new Date(transaction.occurred_at).getTime() <=
    context.settings.void_window_minutes * 60_000;
  const canVoid =
    transaction.status === "completed" &&
    (isOwner ||
      (context.settings.employees_can_void_own_recent_transactions &&
        transaction.employee_id === context.userId &&
        withinWindow));

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <PageHeader
        title="Transaction"
        backHref="/transactions"
        action={transaction.status === "voided" ? <Badge variant="destructive">Voided</Badge> : undefined}
      />

      <div className="mb-4 rounded-xl border bg-card p-4 text-center">
        <p className="text-3xl font-semibold tabular-nums">
          {formatCurrency(transaction.total, context.business.default_currency)}
        </p>
        <p className="text-sm text-muted-foreground">
          {PAYMENT_LABELS[paymentMethod?.code ?? ""] ?? paymentMethod?.label} ·{" "}
          {format(new Date(transaction.occurred_at), "MMM d, yyyy h:mm a")}
        </p>
        <p className="text-sm text-muted-foreground">Sold by {employee?.full_name ?? "Unknown"}</p>
      </div>

      <div className="mb-4 divide-y overflow-hidden rounded-xl border bg-card">
        {(items ?? []).map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.item_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.item_type}
                {item.color ? ` · ${item.color}` : ""} · Qty {item.quantity} ×{" "}
                {formatCurrency(item.unit_price, context.business.default_currency)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold">
              {formatCurrency(item.line_total, context.business.default_currency)}
            </p>
          </div>
        ))}
      </div>

      {transaction.note && (
        <div className="mb-4 rounded-lg border bg-card p-3 text-sm">
          <p className="mb-0.5 text-xs font-medium text-muted-foreground">Note</p>
          {transaction.note}
        </div>
      )}

      {transaction.status === "voided" && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">Voided</p>
          <p className="text-muted-foreground">
            By {voidedByProfile?.full_name ?? "Unknown"} on{" "}
            {transaction.voided_at && format(new Date(transaction.voided_at), "MMM d, yyyy h:mm a")}
          </p>
          <p className="mt-1">{transaction.void_reason}</p>
        </div>
      )}

      {canVoid && <VoidTransactionDialog transactionId={transaction.id} />}
    </div>
  );
}
