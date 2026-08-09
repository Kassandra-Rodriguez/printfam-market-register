"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createBusinessSchema, inviteEmployeeSchema } from "@/lib/validations/business";
import type { ActionResult } from "@/lib/actions/auth";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function createBusiness(
  values: unknown
): Promise<ActionResult & { businessId?: string }> {
  const parsed = createBusinessSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_business", {
    p_name: v.businessName,
    p_owner_name: v.ownerName,
    p_email: v.email,
    p_phone: v.phone || null,
    p_default_currency: v.defaultCurrency,
    p_timezone: v.timezone,
    p_logo_url: v.logoUrl || null,
  });

  if (error) return { error: error.message };
  return { error: null, businessId: data as string };
}

export async function inviteEmployee(
  businessId: string,
  values: unknown
): Promise<ActionResult & { link?: string }> {
  const parsed = inviteEmployeeSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("invite_employee", {
    p_business_id: businessId,
    p_email: parsed.data.email,
  });

  if (error) return { error: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  const link = `${siteUrl()}/join/${row.token}`;

  // Best-effort email via Supabase Auth's admin invite. This requires the
  // Supabase project to have an email provider configured; if it isn't, the
  // invitation record still exists and the owner can share `link` directly.
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient();
      await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
        redirectTo: link,
      });
    }
  } catch {
    // Ignore -- the copyable link below is the guaranteed fallback path.
  }

  return { error: null, link };
}

export async function acceptInvitation(token: string): Promise<ActionResult & { businessId?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });

  if (error) return { error: error.message };
  return { error: null, businessId: data as string };
}

export async function getInvitationPreview(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invitation_preview", { p_token: token });
  if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
  return Array.isArray(data) ? data[0] : data;
}
