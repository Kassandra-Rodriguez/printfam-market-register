import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type BusinessContext = {
  userId: string;
  business: Database["public"]["Tables"]["businesses"]["Row"];
  membership: Database["public"]["Tables"]["business_members"]["Row"];
  settings: Database["public"]["Tables"]["business_settings"]["Row"];
};

// Server-only helper used by the (app) layout and server actions to resolve
// "which business is this request for" and "what can this user do in it".
// A user can belong to at most one active business in v1.
export async function getCurrentBusinessContext(): Promise<BusinessContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("business_members")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) return null;

  const [{ data: business }, { data: settings }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", membership.business_id).single(),
    supabase
      .from("business_settings")
      .select("*")
      .eq("business_id", membership.business_id)
      .single(),
  ]);

  if (!business || !settings) return null;

  return { userId: user.id, business, membership, settings };
}
