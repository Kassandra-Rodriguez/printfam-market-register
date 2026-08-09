// Seeds a realistic demo business through the SAME code path a real user
// would go through: create auth users via the admin API, sign in as each
// one, and call the real RPC functions (create_business, invite_employee,
// accept_invitation, complete_sale, adjust_inventory, start_event,
// close_event, record_cash_count). Nothing here writes directly to tables
// that the app itself only reaches through those functions.
//
// Usage:
//   node --env-file=.env.local -r tsx/cjs scripts/seed.ts
//   (or: npm run seed -- reads NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
//   SUPABASE_SERVICE_ROLE_KEY from your environment / .env.local)
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run this with your .env.local loaded, e.g.:\n" +
      "  node --env-file=.env.local -r tsx/cjs scripts/seed.ts"
  );
  process.exit(1);
}

const DEMO_PASSWORD = "Password123!";
const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createSignedInUser(email: string, fullName: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`Creating ${email}: ${error.message}`);

  const client = createClient<Database>(SUPABASE_URL!, ANON_KEY!);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (signInError) throw new Error(`Signing in ${email}: ${signInError.message}`);

  return { userId: data.user!.id, email, fullName, client };
}

type SeededUser = Awaited<ReturnType<typeof createSignedInUser>>;

async function inviteAndJoin(owner: SeededUser, businessId: string, employee: SeededUser) {
  const { data: invite, error } = await owner.client.rpc("invite_employee", {
    p_business_id: businessId,
    p_email: employee.email,
  });
  if (error) throw new Error(`Inviting ${employee.email}: ${error.message}`);
  const token = Array.isArray(invite) ? invite[0].token : (invite as unknown as { token: string }).token;

  const { error: acceptError } = await employee.client.rpc("accept_invitation", { p_token: token });
  if (acceptError) throw new Error(`${employee.email} accepting invite: ${acceptError.message}`);
}

type ItemSeed = {
  name: string;
  category: string;
  color: string;
  quantity: number;
  price: number;
  cost: number;
  lowStockThreshold?: number;
  sku?: string;
};

async function createItem(owner: SeededUser, businessId: string, item: ItemSeed) {
  const { data, error } = await owner.client
    .from("inventory_items")
    .insert({
      business_id: businessId,
      name: item.name,
      category: item.category,
      color: item.color,
      quantity: item.quantity,
      price: item.price,
      cost: item.cost,
      low_stock_threshold: item.lowStockThreshold ?? null,
      sku: item.sku ?? null,
      created_by: owner.userId,
      updated_by: owner.userId,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Creating item ${item.name}: ${error.message}`);
  return data;
}

async function sell(
  seller: SeededUser,
  eventId: string,
  payment: "cash" | "cashapp" | "card",
  lines: { itemId: string; quantity: number }[],
  note?: string
) {
  const { error } = await seller.client.rpc("complete_sale", {
    p_event_id: eventId,
    p_payment_method_code: payment,
    p_items: lines.map((l) => ({ inventory_item_id: l.itemId, quantity: l.quantity })),
    p_note: note,
  });
  if (error) throw new Error(`Sale failed: ${error.message}`);
}

async function main() {
  console.log("Creating demo accounts...");
  const owner = await createSignedInUser("owner@demo.marketregister.app", "Jamie Rivera");
  const alex = await createSignedInUser("alex@demo.marketregister.app", "Alex Chen");
  const morgan = await createSignedInUser("morgan@demo.marketregister.app", "Morgan Lee");
  const sam = await createSignedInUser("sam@demo.marketregister.app", "Sam Patel");

  console.log("Creating business...");
  const { data: businessId, error: bizError } = await owner.client.rpc("create_business", {
    p_name: "Rivera Handmade Co.",
    p_owner_name: owner.fullName,
    p_email: owner.email,
    p_phone: "555-0142",
    p_default_currency: "USD",
    p_timezone: "America/New_York",
  });
  if (bizError) throw new Error(`Creating business: ${bizError.message}`);

  console.log("Inviting employees...");
  for (const employee of [alex, morgan, sam]) {
    await inviteAndJoin(owner, businessId as string, employee);
  }

  console.log("Adding inventory...");
  const itemSeeds: ItemSeed[] = [
    { name: "Mini Dragon", category: "Toy", color: "Purple", quantity: 18, price: 22, cost: 9, lowStockThreshold: 4 },
    { name: "Mini Dragon", category: "Toy", color: "Teal", quantity: 14, price: 22, cost: 9, lowStockThreshold: 4 },
    { name: "Mini Dragon", category: "Toy", color: "Gold", quantity: 6, price: 24, cost: 10, lowStockThreshold: 4 },
    { name: "Plush Fox", category: "Toy", color: "Orange", quantity: 12, price: 18, cost: 7, lowStockThreshold: 3 },
    { name: "Plush Fox", category: "Toy", color: "Cream", quantity: 9, price: 18, cost: 7, lowStockThreshold: 3 },
    { name: "Card Binder", category: "Card Accessory", color: "Black", quantity: 10, price: 28, cost: 14, lowStockThreshold: 2 },
    { name: "Card Binder", category: "Card Accessory", color: "White", quantity: 3, price: 28, cost: 14, lowStockThreshold: 2 },
    { name: "Deck Box", category: "Card Accessory", color: "Red", quantity: 15, price: 12, cost: 5, lowStockThreshold: 3 },
    { name: "Deck Box", category: "Card Accessory", color: "Blue", quantity: 15, price: 12, cost: 5, lowStockThreshold: 3 },
    { name: "Keychain", category: "Accessory", color: "Blue", quantity: 30, price: 8, cost: 3, lowStockThreshold: 6 },
    { name: "Keychain", category: "Accessory", color: "Pink", quantity: 25, price: 8, cost: 3, lowStockThreshold: 6 },
    { name: "Keychain", category: "Accessory", color: "Black", quantity: 2, price: 8, cost: 3, lowStockThreshold: 6 },
    { name: "Enamel Pin", category: "Accessory", color: "Gold", quantity: 20, price: 10, cost: 4, lowStockThreshold: 5 },
    { name: "Enamel Pin", category: "Accessory", color: "Silver", quantity: 20, price: 10, cost: 4, lowStockThreshold: 5 },
    { name: "Holographic Sticker Sheet", category: "Sticker", color: "Rainbow", quantity: 40, price: 5, cost: 1.5, lowStockThreshold: 8 },
    { name: "Vinyl Sticker Pack", category: "Sticker", color: "Multi", quantity: 35, price: 6, cost: 2, lowStockThreshold: 8 },
    { name: "Art Print", category: "Print", color: "Full Color", quantity: 20, price: 15, cost: 4, lowStockThreshold: 5 },
  ];
  const items: Database["public"]["Tables"]["inventory_items"]["Row"][] = [];
  for (const seed of itemSeeds) {
    items.push(await createItem(owner, businessId as string, seed));
  }
  const byName = (name: string, color: string) =>
    items.find((i) => i.name === name && i.color === color)!;

  console.log("Recording inventory adjustments...");
  await owner.client.rpc("adjust_inventory", {
    p_item_id: byName("Mini Dragon", "Teal").id,
    p_adjustment_type: "stock_added",
    p_delta: 12,
    p_note: "Restocked from supplier ahead of the weekend market",
  });
  await alex.client.rpc("adjust_inventory", {
    p_item_id: byName("Plush Fox", "Cream").id,
    p_adjustment_type: "damaged",
    p_delta: -2,
    p_note: "Two units got rained on at the last event and are unsellable",
  });
  await morgan.client.rpc("adjust_inventory", {
    p_item_id: byName("Card Binder", "Black").id,
    p_adjustment_type: "manual_correction",
    p_set_to: 10,
    p_note: "Recount after last weekend -- system count was off by one",
  });

  console.log("Creating events...");
  const { data: pastEvent, error: pastEventError } = await owner.client
    .from("events")
    .insert({
      business_id: businessId as string,
      name: "Spring Craft Fair",
      event_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      start_time: "09:00",
      end_time: "16:00",
      location: "Maple Street Community Center",
      created_by: owner.userId,
    })
    .select("id")
    .single();
  if (pastEventError) throw new Error(`Creating past event: ${pastEventError.message}`);

  const { data: activeEvent, error: activeEventError } = await owner.client
    .from("events")
    .insert({
      business_id: businessId as string,
      name: "Downtown Pop-Up Market",
      event_date: new Date().toISOString().slice(0, 10),
      start_time: "10:00",
      end_time: "18:00",
      location: "Main Street Plaza",
      created_by: owner.userId,
    })
    .select("id")
    .single();
  if (activeEventError) throw new Error(`Creating active event: ${activeEventError.message}`);

  console.log("Selling at the (now closed) Spring Craft Fair...");
  await owner.client.rpc("start_event", { p_event_id: pastEvent.id });

  await sell(alex, pastEvent.id, "cash", [{ itemId: byName("Mini Dragon", "Purple").id, quantity: 2 }]);
  await sell(alex, pastEvent.id, "card", [{ itemId: byName("Keychain", "Blue").id, quantity: 3 }]);
  await sell(morgan, pastEvent.id, "cashapp", [
    { itemId: byName("Card Binder", "Black").id, quantity: 1 },
    { itemId: byName("Deck Box", "Red").id, quantity: 2 },
  ]);
  await sell(sam, pastEvent.id, "cash", [{ itemId: byName("Enamel Pin", "Gold").id, quantity: 4 }], "Customer bought one of each color");
  await sell(owner, pastEvent.id, "card", [{ itemId: byName("Art Print", "Full Color").id, quantity: 1 }]);
  await sell(alex, pastEvent.id, "cash", [{ itemId: byName("Holographic Sticker Sheet", "Rainbow").id, quantity: 5 }]);

  await owner.client.rpc("close_event", {
    p_event_id: pastEvent.id,
    p_starting_cash: 100,
    p_actual_cash: 178,
    p_note: "Counted with Alex at the end of the day, all good",
  });

  console.log("Starting the active event and recording a few more sales...");
  await owner.client.rpc("start_event", { p_event_id: activeEvent.id });

  await sell(morgan, activeEvent.id, "cash", [{ itemId: byName("Plush Fox", "Orange").id, quantity: 1 }]);
  await sell(sam, activeEvent.id, "cashapp", [{ itemId: byName("Vinyl Sticker Pack", "Multi").id, quantity: 2 }]);
  await sell(alex, activeEvent.id, "card", [
    { itemId: byName("Mini Dragon", "Gold").id, quantity: 1 },
    { itemId: byName("Keychain", "Pink").id, quantity: 2 },
  ], "Gift for a friend's birthday");

  console.log("\nDone. Demo login (all accounts use the same password):");
  console.log(`  Owner:    ${owner.email}`);
  console.log(`  Employee: ${alex.email}`);
  console.log(`  Employee: ${morgan.email}`);
  console.log(`  Employee: ${sam.email}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
