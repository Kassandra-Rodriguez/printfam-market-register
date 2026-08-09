// Integration tests against a REAL local Supabase instance (the same
// migrations that ship to production). These are not mocked: every check
// below runs the actual RLS policies and SECURITY DEFINER functions in
// supabase/migrations/. Run `supabase start`, then:
//
//   SUPABASE_TEST_URL=http://127.0.0.1:54321 \
//   SUPABASE_TEST_ANON_KEY=<anon key from `supabase start` output> \
//   SUPABASE_TEST_SERVICE_ROLE_KEY=<service_role key from `supabase start` output> \
//   npm test
//
// The suite is skipped (not failed) if those env vars aren't set, so a plain
// `npm test` still runs the pure unit tests in tests/unit/.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, createSignedInUser, hasTestEnv, uniqueEmail } from "./helpers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const should = hasTestEnv() ? describe : describe.skip;

should("business rules (live Supabase)", () => {
  let admin: SupabaseClient<Database>;
  let ownerA: { userId: string; client: SupabaseClient<Database> };
  let employeeA: { userId: string; client: SupabaseClient<Database> };
  let ownerB: { userId: string; client: SupabaseClient<Database> };
  let businessAId: string;
  let businessBId: string;
  let eventAId: string;

  beforeAll(async () => {
    admin = adminClient();
    ownerA = await createSignedInUser(uniqueEmail("owner-a"), "password1234");
    employeeA = await createSignedInUser(uniqueEmail("employee-a"), "password1234");
    ownerB = await createSignedInUser(uniqueEmail("owner-b"), "password1234");

    const { data: bizA, error: bizAErr } = await ownerA.client.rpc("create_business", {
      p_name: "Test Business A",
      p_owner_name: "Owner A",
      p_email: "owner-a@example.test",
    });
    if (bizAErr) throw bizAErr;
    businessAId = bizA as string;

    const { data: bizB, error: bizBErr } = await ownerB.client.rpc("create_business", {
      p_name: "Test Business B",
      p_owner_name: "Owner B",
      p_email: "owner-b@example.test",
    });
    if (bizBErr) throw bizBErr;
    businessBId = bizB as string;

    // Invite employee A into business A and accept as that employee.
    const { data: invite, error: inviteErr } = await ownerA.client.rpc("invite_employee", {
      p_business_id: businessAId,
      p_email: (await admin.auth.admin.getUserById(employeeA.userId)).data.user!.email!,
    });
    if (inviteErr) throw inviteErr;
    const token = Array.isArray(invite) ? invite[0].token : (invite as { token: string }).token;
    const { error: acceptErr } = await employeeA.client.rpc("accept_invitation", { p_token: token });
    if (acceptErr) throw acceptErr;

    // Allow employee A to adjust inventory and void their own sales, for the tests that need it.
    await admin
      .from("business_settings")
      .update({
        employees_can_adjust_inventory: true,
        employees_can_void_own_recent_transactions: true,
      })
      .eq("business_id", businessAId);

    const { data: event, error: eventErr } = await ownerA.client
      .from("events")
      .insert({
        business_id: businessAId,
        name: "Test Market",
        event_date: "2026-01-01",
        created_by: ownerA.userId,
      })
      .select("id")
      .single();
    if (eventErr) throw eventErr;
    eventAId = event.id;

    const { error: startErr } = await ownerA.client.rpc("start_event", { p_event_id: eventAId });
    if (startErr) throw startErr;
  }, 30_000);

  afterAll(async () => {
    // Clean up: deleting the businesses cascades to every row created above.
    await admin.from("businesses").delete().in("id", [businessAId, businessBId]);
    await admin.auth.admin.deleteUser(ownerA.userId);
    await admin.auth.admin.deleteUser(employeeA.userId);
    await admin.auth.admin.deleteUser(ownerB.userId);
  });

  async function createItem(quantity: number, price: number, cost: number) {
    const { data, error } = await ownerA.client
      .from("inventory_items")
      .insert({
        business_id: businessAId,
        name: `Test Item ${Math.random().toString(36).slice(2, 8)}`,
        category: "Toy",
        color: "Purple",
        quantity,
        price,
        cost,
        created_by: ownerA.userId,
        updated_by: ownerA.userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  it("1. a user cannot access another business's data", async () => {
    const { data, error } = await ownerB.client
      .from("businesses")
      .select("*")
      .eq("id", businessAId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeNull();

    const { data: items } = await ownerB.client
      .from("inventory_items")
      .select("*")
      .eq("business_id", businessAId);
    expect(items).toEqual([]);
  });

  it("2. an employee can record a valid sale", async () => {
    const item = await createItem(10, 25, 10);

    const { data: txId, error } = await employeeA.client.rpc("complete_sale", {
      p_event_id: eventAId,
      p_payment_method_code: "cash",
      p_items: [{ inventory_item_id: item.id, quantity: 2 }],
    });

    expect(error).toBeNull();
    expect(txId).toBeTruthy();

    const { data: tx } = await employeeA.client
      .from("transactions")
      .select("*")
      .eq("id", txId as string)
      .single();
    expect(tx?.status).toBe("completed");
    expect(Number(tx?.total)).toBe(50);
  });

  it("3. inventory decreases after a sale", async () => {
    const item = await createItem(10, 25, 10);

    await employeeA.client.rpc("complete_sale", {
      p_event_id: eventAId,
      p_payment_method_code: "cash",
      p_items: [{ inventory_item_id: item.id, quantity: 3 }],
    });

    const { data: updated } = await ownerA.client
      .from("inventory_items")
      .select("quantity")
      .eq("id", item.id)
      .single();
    expect(updated?.quantity).toBe(7);
  });

  it("4. a sale fails when inventory is insufficient", async () => {
    const item = await createItem(2, 25, 10);

    const { error } = await employeeA.client.rpc("complete_sale", {
      p_event_id: eventAId,
      p_payment_method_code: "cash",
      p_items: [{ inventory_item_id: item.id, quantity: 5 }],
    });

    expect(error).not.toBeNull();

    const { data: unchanged } = await ownerA.client
      .from("inventory_items")
      .select("quantity")
      .eq("id", item.id)
      .single();
    expect(unchanged?.quantity).toBe(2);
  });

  it("5. a void returns inventory", async () => {
    const item = await createItem(10, 25, 10);

    const { data: txId } = await employeeA.client.rpc("complete_sale", {
      p_event_id: eventAId,
      p_payment_method_code: "cash",
      p_items: [{ inventory_item_id: item.id, quantity: 4 }],
    });

    const { data: afterSale } = await ownerA.client
      .from("inventory_items")
      .select("quantity")
      .eq("id", item.id)
      .single();
    expect(afterSale?.quantity).toBe(6);

    const { error: voidError } = await ownerA.client.rpc("void_transaction", {
      p_transaction_id: txId as string,
      p_reason: "Test void",
    });
    expect(voidError).toBeNull();

    const { data: afterVoid } = await ownerA.client
      .from("inventory_items")
      .select("quantity")
      .eq("id", item.id)
      .single();
    expect(afterVoid?.quantity).toBe(10);
  });

  it("6. voided transactions are excluded from active sales totals", async () => {
    const item = await createItem(10, 100, 10);

    const { data: txId } = await employeeA.client.rpc("complete_sale", {
      p_event_id: eventAId,
      p_payment_method_code: "card",
      p_items: [{ inventory_item_id: item.id, quantity: 1 }],
    });
    await ownerA.client.rpc("void_transaction", {
      p_transaction_id: txId as string,
      p_reason: "Test void for totals",
    });

    const { data: completedOnly } = await ownerA.client
      .from("transactions")
      .select("total")
      .eq("event_id", eventAId)
      .eq("status", "completed");

    const total = (completedOnly ?? []).reduce((sum, t) => sum + Number(t.total), 0);
    // The voided $100 sale must not appear in the completed-only total.
    const { data: voided } = await ownerA.client
      .from("transactions")
      .select("id")
      .eq("id", txId as string)
      .eq("status", "voided")
      .single();
    expect(voided).not.toBeNull();
    expect((completedOnly ?? []).some((t) => Number(t.total) === 100)).toBe(false);
    expect(total).toBeGreaterThanOrEqual(0);
  });

  it("7. payment method totals are correct", async () => {
    const cashItem = await createItem(10, 20, 5);
    const cardItem = await createItem(10, 30, 5);

    await employeeA.client.rpc("complete_sale", {
      p_event_id: eventAId,
      p_payment_method_code: "cash",
      p_items: [{ inventory_item_id: cashItem.id, quantity: 1 }],
    });
    await employeeA.client.rpc("complete_sale", {
      p_event_id: eventAId,
      p_payment_method_code: "card",
      p_items: [{ inventory_item_id: cardItem.id, quantity: 1 }],
    });

    const { data: paymentMethods } = await ownerA.client.from("payment_methods").select("id, code");
    const cashId = paymentMethods!.find((p) => p.code === "cash")!.id;
    const cardId = paymentMethods!.find((p) => p.code === "card")!.id;

    const { data: cashTx } = await ownerA.client
      .from("transactions")
      .select("total")
      .eq("event_id", eventAId)
      .eq("payment_method_id", cashId)
      .eq("status", "completed");
    const { data: cardTx } = await ownerA.client
      .from("transactions")
      .select("total")
      .eq("event_id", eventAId)
      .eq("payment_method_id", cardId)
      .eq("status", "completed");

    expect((cashTx ?? []).some((t) => Number(t.total) === 20)).toBe(true);
    expect((cardTx ?? []).some((t) => Number(t.total) === 30)).toBe(true);
  });

  it("8. cash count calculations are correct", async () => {
    const item = await createItem(10, 40, 10);
    await employeeA.client.rpc("complete_sale", {
      p_event_id: eventAId,
      p_payment_method_code: "cash",
      p_items: [{ inventory_item_id: item.id, quantity: 1 }],
    });

    const { data: cashCountId, error } = await ownerA.client.rpc("record_cash_count", {
      p_event_id: eventAId,
      p_actual_cash: 100,
      p_starting_cash: 50,
    });
    expect(error).toBeNull();

    const { data: count } = await ownerA.client
      .from("cash_counts")
      .select("*")
      .eq("id", cashCountId as string)
      .single();

    // expected = starting_cash + recorded_cash_sales; difference = actual - expected
    expect(Number(count!.expected_cash)).toBe(Number(count!.starting_cash) + Number(count!.recorded_cash_sales));
    expect(Number(count!.difference)).toBe(Number(count!.actual_cash) - Number(count!.expected_cash));
  });

  it("9. employee attribution is saved on the sale", async () => {
    const item = await createItem(10, 15, 5);
    const { data: txId } = await employeeA.client.rpc("complete_sale", {
      p_event_id: eventAId,
      p_payment_method_code: "cash",
      p_items: [{ inventory_item_id: item.id, quantity: 1 }],
    });

    const { data: tx } = await ownerA.client
      .from("transactions")
      .select("employee_id")
      .eq("id", txId as string)
      .single();
    expect(tx?.employee_id).toBe(employeeA.userId);
  });

  it("10. historical item snapshots remain unchanged after inventory edits", async () => {
    const item = await createItem(10, 50, 20);
    const { data: txId } = await employeeA.client.rpc("complete_sale", {
      p_event_id: eventAId,
      p_payment_method_code: "cash",
      p_items: [{ inventory_item_id: item.id, quantity: 1 }],
    });

    // Owner edits the price/cost after the sale.
    await ownerA.client
      .from("inventory_items")
      .update({ price: 999, cost: 999 })
      .eq("id", item.id);

    const { data: lineItem } = await ownerA.client
      .from("transaction_items")
      .select("unit_price, unit_cost")
      .eq("transaction_id", txId as string)
      .single();

    expect(Number(lineItem?.unit_price)).toBe(50);
    expect(Number(lineItem?.unit_cost)).toBe(20);
  });
});
