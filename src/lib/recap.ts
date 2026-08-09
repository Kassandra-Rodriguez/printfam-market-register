import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMethodCode } from "@/types/database.types";

export type RecapFilters = {
  businessId: string;
  eventId?: string;
  employeeId?: string;
  paymentMethodCode?: PaymentMethodCode;
  from?: string;
  to?: string;
};

export type Recap = {
  grossSales: number;
  transactionCount: number;
  itemsSold: number;
  estimatedCost: number;
  estimatedProfit: number;
  paymentTotals: Record<PaymentMethodCode, number>;
  voidedTotal: number;
  voidedCount: number;
};

export type BestSellingItem = { name: string; quantity: number; revenue: number };
export type SalesByEmployee = { employeeId: string; name: string; total: number; count: number };

const emptyPaymentTotals = (): Record<PaymentMethodCode, number> => ({
  cash: 0,
  cashapp: 0,
  card: 0,
});

async function getFilteredTransactions(filters: RecapFilters) {
  const supabase = await createClient();

  const { data: paymentMethods } = await supabase.from("payment_methods").select("id, code");
  const codeById = new Map((paymentMethods ?? []).map((pm) => [pm.id, pm.code as PaymentMethodCode]));
  const idByCode = new Map((paymentMethods ?? []).map((pm) => [pm.code, pm.id]));

  let query = supabase
    .from("transactions")
    .select("id, status, total, employee_id, occurred_at, payment_method_id")
    .eq("business_id", filters.businessId);

  if (filters.eventId) query = query.eq("event_id", filters.eventId);
  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.paymentMethodCode) {
    const id = idByCode.get(filters.paymentMethodCode);
    query = query.eq("payment_method_id", id ?? "00000000-0000-0000-0000-000000000000");
  }
  if (filters.from) query = query.gte("occurred_at", filters.from);
  if (filters.to) query = query.lte("occurred_at", filters.to);

  const { data: transactions } = await query;
  const all = transactions ?? [];

  return {
    supabase,
    codeById,
    all,
    completed: all.filter((t) => t.status === "completed"),
    voided: all.filter((t) => t.status === "voided"),
  };
}

// Shared recap math for the event dashboard, close-event summary, home
// dashboard, and reports -- one place computing gross sales, payment
// breakdowns, and estimated profit from transaction + snapshot data.
export async function getRecap(filters: RecapFilters): Promise<Recap> {
  const { supabase, codeById, completed, voided } = await getFilteredTransactions(filters);

  const paymentTotals = emptyPaymentTotals();
  for (const t of completed) {
    const code = codeById.get(t.payment_method_id);
    if (code) paymentTotals[code] += Number(t.total);
  }

  const grossSales = completed.reduce((sum, t) => sum + Number(t.total), 0);
  const voidedTotal = voided.reduce((sum, t) => sum + Number(t.total), 0);

  let itemsSold = 0;
  let estimatedCost = 0;
  if (completed.length > 0) {
    const { data: items } = await supabase
      .from("transaction_items")
      .select("quantity, unit_cost, transaction_id")
      .in(
        "transaction_id",
        completed.map((t) => t.id)
      );
    for (const item of items ?? []) {
      itemsSold += item.quantity;
      estimatedCost += item.quantity * Number(item.unit_cost);
    }
  }

  return {
    grossSales,
    transactionCount: completed.length,
    itemsSold,
    estimatedCost,
    estimatedProfit: grossSales - estimatedCost,
    paymentTotals,
    voidedTotal,
    voidedCount: voided.length,
  };
}

export async function getBestSellingItems(filters: RecapFilters, limit = 10): Promise<BestSellingItem[]> {
  const { supabase, completed } = await getFilteredTransactions(filters);
  if (completed.length === 0) return [];

  const { data: items } = await supabase
    .from("transaction_items")
    .select("item_name, quantity, line_total, transaction_id")
    .in(
      "transaction_id",
      completed.map((t) => t.id)
    );

  const byName = new Map<string, BestSellingItem>();
  for (const item of items ?? []) {
    const existing = byName.get(item.item_name) ?? { name: item.item_name, quantity: 0, revenue: 0 };
    existing.quantity += item.quantity;
    existing.revenue += Number(item.line_total);
    byName.set(item.item_name, existing);
  }

  return Array.from(byName.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export async function getSalesByEmployee(filters: RecapFilters): Promise<SalesByEmployee[]> {
  const { supabase, completed } = await getFilteredTransactions(filters);
  if (completed.length === 0) return [];

  const { data: profiles } = await supabase.from("profiles").select("id, full_name");
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const byEmployee = new Map<string, SalesByEmployee>();
  for (const t of completed) {
    const existing = byEmployee.get(t.employee_id) ?? {
      employeeId: t.employee_id,
      name: nameById.get(t.employee_id) ?? "Unknown",
      total: 0,
      count: 0,
    };
    existing.total += Number(t.total);
    existing.count += 1;
    byEmployee.set(t.employee_id, existing);
  }

  return Array.from(byEmployee.values()).sort((a, b) => b.total - a.total);
}
