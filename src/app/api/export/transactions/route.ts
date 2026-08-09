import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { resolveRange } from "@/lib/report-filters";
import { toCsv } from "@/lib/csv";
import type { PaymentMethodCode } from "@/types/database.types";

export async function GET(request: NextRequest) {
  const context = await getCurrentBusinessContext();
  if (!context || context.membership.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const { from, to } = resolveRange(
    context.business.timezone,
    searchParams.get("range") ?? undefined,
    searchParams.get("from") ?? undefined,
    searchParams.get("to") ?? undefined
  );
  const eventId = searchParams.get("event") ?? undefined;
  const employeeId = searchParams.get("employee") ?? undefined;
  const paymentCode = searchParams.get("payment") as PaymentMethodCode | null;

  const supabase = await createClient();
  const { data: paymentMethods } = await supabase.from("payment_methods").select("id, code");
  const codeById = new Map((paymentMethods ?? []).map((pm) => [pm.id, pm.code]));
  const idByCode = new Map((paymentMethods ?? []).map((pm) => [pm.code, pm.id]));

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("business_id", context.business.id)
    .gte("occurred_at", from)
    .lte("occurred_at", to)
    .order("occurred_at", { ascending: false });

  if (eventId) query = query.eq("event_id", eventId);
  if (employeeId) query = query.eq("employee_id", employeeId);
  if (paymentCode) query = query.eq("payment_method_id", idByCode.get(paymentCode) ?? "");

  const { data: transactions } = await query;
  const txIds = (transactions ?? []).map((t) => t.id);

  const [{ data: items }, { data: events }, { data: profiles }] = await Promise.all([
    txIds.length
      ? supabase.from("transaction_items").select("*").in("transaction_id", txIds)
      : Promise.resolve({ data: [] }),
    supabase.from("events").select("id, name").eq("business_id", context.business.id),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const eventNameById = new Map((events ?? []).map((e) => [e.id, e.name]));
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  type ExportRow = {
    transaction_id: string;
    date: string;
    employee: string;
    event: string;
    payment_method: string;
    status: string;
    transaction_total: number;
    note: string;
    void_reason: string;
    item_name: string;
    item_type: string;
    color: string;
    quantity: number | "";
    unit_price: number | "";
    line_total: number | "";
  };

  const nonNullItems = (items ?? []).filter((item): item is NonNullable<typeof item> => item !== null);
  const itemsByTx = new Map<string, typeof nonNullItems>();
  for (const item of nonNullItems) {
    const list = itemsByTx.get(item.transaction_id) ?? [];
    list.push(item);
    itemsByTx.set(item.transaction_id, list);
  }

  const rows: ExportRow[] = (transactions ?? []).flatMap((t): ExportRow[] => {
    const lines = itemsByTx.get(t.id) ?? [];
    const base = {
      transaction_id: t.id,
      date: t.occurred_at,
      employee: nameById.get(t.employee_id) ?? "",
      event: eventNameById.get(t.event_id) ?? "",
      payment_method: codeById.get(t.payment_method_id) ?? "",
      status: t.status,
      transaction_total: t.total,
      note: t.note ?? "",
      void_reason: t.void_reason ?? "",
    };
    if (lines.length === 0) {
      return [{ ...base, item_name: "", item_type: "", color: "", quantity: "", unit_price: "", line_total: "" }];
    }
    return lines.map((line) => ({
      ...base,
      item_name: line.item_name,
      item_type: line.item_type,
      color: line.color,
      quantity: line.quantity,
      unit_price: line.unit_price,
      line_total: line.line_total,
    }));
  });

  const csv = toCsv(rows, [
    { key: "transaction_id", label: "Transaction ID" },
    { key: "date", label: "Date" },
    { key: "employee", label: "Employee" },
    { key: "event", label: "Event" },
    { key: "payment_method", label: "Payment Method" },
    { key: "status", label: "Status" },
    { key: "item_name", label: "Item" },
    { key: "item_type", label: "Type" },
    { key: "color", label: "Color" },
    { key: "quantity", label: "Quantity" },
    { key: "unit_price", label: "Unit Price" },
    { key: "line_total", label: "Line Total" },
    { key: "transaction_total", label: "Transaction Total" },
    { key: "note", label: "Note" },
    { key: "void_reason", label: "Void Reason" },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="transactions.csv"`,
    },
  });
}
