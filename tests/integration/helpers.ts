import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export function hasTestEnv() {
  return Boolean(
    process.env.SUPABASE_TEST_URL &&
      process.env.SUPABASE_TEST_ANON_KEY &&
      process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
  );
}

export function adminClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.SUPABASE_TEST_URL!,
    process.env.SUPABASE_TEST_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Creates a confirmed auth user and returns a client signed in as that user.
export async function createSignedInUser(email: string, password: string) {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;

  const client = createClient<Database>(
    process.env.SUPABASE_TEST_URL!,
    process.env.SUPABASE_TEST_ANON_KEY!
  );
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { userId: data.user!.id, client };
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}
