import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// SERVER ONLY. Uses the service role key, which bypasses Row Level Security.
// Never import this from a Client Component or expose the key to the browser.
// Reserved for administrative tasks that RLS cannot express, such as sending
// an employee invite email through Supabase Auth's admin API.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
