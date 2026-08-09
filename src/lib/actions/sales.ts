"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { voidTransactionSchema } from "@/lib/validations/events";
import type { ActionResult } from "@/lib/actions/auth";
import type { PaymentMethodCode } from "@/types/database.types";

export type SaleItemInput = { inventoryItemId: string; variantId?: string | null; quantity: number };

export async function completeSale(
  eventId: string,
  paymentMethodCode: PaymentMethodCode,
  items: SaleItemInput[],
  note?: string
): Promise<ActionResult & { transactionId?: string }> {
  if (!items.length) return { error: "Add at least one item to the sale." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_sale", {
    p_event_id: eventId,
    p_payment_method_code: paymentMethodCode,
    p_items: items.map((i) => ({
      inventory_item_id: i.inventoryItemId,
      variant_id: i.variantId ?? null,
      quantity: i.quantity,
    })),
    p_note: note || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/sell");
  revalidatePath("/inventory");
  revalidatePath(`/events/${eventId}`);
  return { error: null, transactionId: data as string };
}

export async function voidTransaction(transactionId: string, values: unknown): Promise<ActionResult> {
  const parsed = voidTransactionSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid details." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_transaction", {
    p_transaction_id: transactionId,
    p_reason: parsed.data.reason,
  });

  if (error) return { error: error.message };
  revalidatePath("/transactions");
  revalidatePath(`/transactions/${transactionId}`);
  revalidatePath("/inventory");
  return { error: null };
}
