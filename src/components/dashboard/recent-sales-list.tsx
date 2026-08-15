import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import { EmptyState } from "@/components/shared/empty-state";
import { Receipt } from "lucide-react";
import { format } from "date-fns";

export type RecentSale = {
  id: string;
  total: number;
  occurred_at: string;
  employeeName: string;
  paymentLabel: string;
  itemsSummary: string;
};

export function RecentSalesList({ sales, currency }: { sales: RecentSale[]; currency: string }) {
  if (sales.length === 0) {
    return (
      <EmptyState icon={Receipt} title="No sales yet" description="Sales you record will appear here." />
    );
  }

  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-card">
      {sales.map((sale) => (
        <Link
          key={sale.id}
          href={`/transactions/${sale.id}`}
          className="flex items-center justify-between gap-3 px-4 py-3 active:bg-muted"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{sale.employeeName}</p>
            {sale.itemsSummary && (
              <p className="truncate text-xs text-muted-foreground">{sale.itemsSummary}</p>
            )}
            <p className="truncate text-xs text-muted-foreground">
              {sale.paymentLabel} · {format(new Date(sale.occurred_at), "h:mm a")}
            </p>
          </div>
          <span className="shrink-0 font-semibold">{formatCurrency(sale.total, currency)}</span>
        </Link>
      ))}
    </div>
  );
}
