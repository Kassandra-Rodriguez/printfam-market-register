"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessContext } from "@/lib/business-context";
import {
  updateBusinessProfileSchema,
  updateBusinessSettingsSchema,
  updateProfileSchema,
} from "@/lib/validations/settings";
import type { ActionResult } from "@/lib/actions/auth";

export async function updateProfile(values: unknown): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid details." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      avatar_url: parsed.data.avatarUrl ?? null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { error: null };
}

export async function updateBusinessProfile(values: unknown): Promise<ActionResult> {
  const parsed = updateBusinessProfileSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid details." };

  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can update the business profile." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      timezone: parsed.data.timezone,
      logo_url: parsed.data.logoUrl ?? null,
    })
    .eq("id", context.business.id);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { error: null };
}

export async function updateBusinessSettings(values: unknown): Promise<ActionResult> {
  const parsed = updateBusinessSettingsSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid details." };

  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can update these settings." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_settings")
    .update({
      allow_negative_inventory: parsed.data.allowNegativeInventory,
      employees_can_adjust_inventory: parsed.data.employeesCanAdjustInventory,
      employees_can_void_own_recent_transactions:
        parsed.data.employeesCanVoidOwnRecentTransactions,
      employees_can_manage_events: parsed.data.employeesCanManageEvents,
      void_window_minutes: parsed.data.voidWindowMinutes,
    })
    .eq("business_id", context.business.id);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { error: null };
}

export async function removeEmployee(memberId: string): Promise<ActionResult> {
  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can remove employees." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_members")
    .update({ status: "removed" })
    .eq("id", memberId)
    .eq("business_id", context.business.id);

  if (error) return { error: error.message };
  revalidatePath("/more/employees");
  return { error: null };
}

export async function revokeInvitation(invitationId: string): Promise<ActionResult> {
  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can manage invitations." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("business_id", context.business.id);

  if (error) return { error: error.message };
  revalidatePath("/more/employees");
  return { error: null };
}
