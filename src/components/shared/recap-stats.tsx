import { formatCurrency } from "@/lib/currency";
import type { Recap } from "@/lib/recap";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function RecapStats({ recap, currency }: { recap: Recap; currency: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Gross sales" value={formatCurrency(recap.grossSales, currency)} />
        <Stat label="Transactions" value={String(recap.transactionCount)} />
        <Stat label="Items sold" value={String(recap.itemsSold)} />
        <Stat label="Est. profit" value={formatCurrency(recap.estimatedProfit, currency)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Cash" value={formatCurrency(recap.paymentTotals.cash, currency)} />
        <Stat label="Cash App" value={formatCurrency(recap.paymentTotals.cashapp, currency)} />
        <Stat label="Card" value={formatCurrency(recap.paymentTotals.card, currency)} />
      </div>
      {recap.voidedCount > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {recap.voidedCount} voided transaction{recap.voidedCount === 1 ? "" : "s"} (
          {formatCurrency(recap.voidedTotal, currency)}) excluded from totals above
        </p>
      )}
      <p className="text-center text-[11px] text-muted-foreground">
        Estimated profit is revenue minus item cost. It does not include taxes, fees, or
        other expenses.
      </p>
    </div>
  );
}
