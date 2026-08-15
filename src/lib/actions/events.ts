"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createEventSchema, closeEventSchema } from "@/lib/validations/events";
import type { ActionResult } from "@/lib/actions/auth";

function canManageEvents(context: NonNullable<Awaited<ReturnType<typeof getCurrentBusinessContext>>>) {
  return context.membership.role === "owner" || context.settings.employees_can_manage_events;
}

export async function createEvent(
  values: unknown
): Promise<ActionResult & { eventId?: string }> {
  const parsed = createEventSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid details." };

  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (!canManageEvents(context)) return { error: "You don't have permission to create events." };

  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      business_id: context.business.id,
      name: v.name,
      event_date: v.eventDate,
      start_time: v.startTime || null,
      end_time: v.endTime || null,
      location: v.location || null,
      notes: v.notes || null,
      created_by: context.userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/events");
  return { error: null, eventId: data.id };
}

export async function startEvent(eventId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_event", { p_event_id: eventId });
  if (error) return { error: error.message };
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  return { error: null };
}

export async function closeEvent(eventId: string, values: unknown): Promise<ActionResult> {
  const parsed = closeEventSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid details." };

  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_event", {
    p_event_id: eventId,
    p_actual_cash: v.actualCash ?? null,
    p_starting_cash: v.startingCash ?? 0,
    p_note: v.note || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  return { error: null };
}

export async function reopenEvent(eventId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_event", { p_event_id: eventId });
  if (error) return { error: error.message };
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  return { error: null };
}

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can delete events." };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("events")
    .delete({ count: "exact" })
    .eq("id", eventId)
    .eq("business_id", context.business.id)
    .eq("status", "closed");

  if (error) {
    if (error.code === "23503") {
      return {
        error: "This event has sales or a cash count recorded and can't be deleted.",
      };
    }
    return { error: error.message };
  }
  if (!count) {
    return { error: "Only closed events can be deleted." };
  }

  revalidatePath("/events");
  return { error: null };
}

export async function recordCashCount(
  eventId: string,
  startingCash: number,
  actualCash: number,
  note?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_cash_count", {
    p_event_id: eventId,
    p_actual_cash: actualCash,
    p_starting_cash: startingCash,
    p_note: note || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/events/${eventId}`);
  return { error: null };
}
