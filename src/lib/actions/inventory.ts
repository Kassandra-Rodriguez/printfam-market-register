"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessContext } from "@/lib/business-context";
import {
  inventoryItemSchema,
  editInventoryItemSchema,
  adjustInventorySchema,
  addVariantsSchema,
  updateVariantSchema,
  convertToVariantsSchema,
  UNCATEGORIZED_CATEGORY,
} from "@/lib/validations/inventory";
import type { ActionResult } from "@/lib/actions/auth";

export async function createInventoryItem(
  values: unknown
): Promise<ActionResult & { itemId?: string }> {
  const parsed = inventoryItemSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid details." };

  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can add inventory items." };
  }

  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      business_id: context.business.id,
      name: v.name,
      category: v.category,
      color: v.color || "",
      sku: v.sku || null,
      description: v.description || null,
      image_url: v.imageUrl ?? null,
      quantity: v.quantity,
      cost: v.cost,
      price: v.price,
      low_stock_threshold: v.lowStockThreshold ?? null,
      created_by: context.userId,
      updated_by: context.userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/inventory");
  return { error: null, itemId: data.id };
}

export async function createInventoryItemVariants(
  values: unknown
): Promise<ActionResult & { itemId?: string }> {
  const parsed = addVariantsSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid details." };

  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can add inventory items." };
  }

  const v = parsed.data;
  const supabase = await createClient();

  // One parent item (quantity/color unused -- each variant tracks its own;
  // price is set to the lowest variant price as a "starting at" fallback for
  // anywhere the parent's price is shown before variants are loaded), then
  // one row per variant. Not wrapped in a single DB transaction (these are
  // plain RLS-protected table writes, not an RPC), so if the variant insert
  // fails we clean up the now-empty parent rather than leave an item with
  // zero variants behind.
  const { data: item, error: itemError } = await supabase
    .from("inventory_items")
    .insert({
      business_id: context.business.id,
      name: v.name,
      category: v.category,
      color: "",
      sku: v.sku || null,
      description: v.description || null,
      image_url: v.imageUrl ?? null,
      quantity: 0,
      cost: v.cost,
      price: Math.min(...v.variants.map((variant) => variant.price)),
      low_stock_threshold: v.lowStockThreshold ?? null,
      has_variants: true,
      variant_label: v.variantLabel,
      created_by: context.userId,
      updated_by: context.userId,
    })
    .select("id")
    .single();

  if (itemError) return { error: itemError.message };

  const variantRows = v.variants.map((variant) => ({
    business_id: context.business.id,
    item_id: item.id,
    value: variant.value,
    price: variant.price,
    quantity: variant.quantity,
    created_by: context.userId,
    updated_by: context.userId,
  }));

  const { error: variantsError } = await supabase.from("inventory_item_variants").insert(variantRows);

  if (variantsError) {
    await supabase.from("inventory_items").delete().eq("id", item.id);
    return { error: variantsError.message };
  }

  revalidatePath("/inventory");
  return { error: null, itemId: item.id };
}

export async function updateVariantLabel(itemId: string, label: string): Promise<ActionResult> {
  const trimmed = label.trim();
  if (!trimmed) return { error: "Enter an option name." };

  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can rename an item's options." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update({ variant_label: trimmed, updated_by: context.userId })
    .eq("id", itemId)
    .eq("business_id", context.business.id)
    .eq("has_variants", true);

  if (error) return { error: error.message };
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${itemId}`);
  revalidatePath("/sell");
  return { error: null };
}

export async function convertItemToVariants(
  itemId: string,
  values: unknown
): Promise<ActionResult> {
  const parsed = convertToVariantsSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid details." };

  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can add options to an item." };
  }

  const v = parsed.data;
  const supabase = await createClient();

  const { data: item, error: fetchError } = await supabase
    .from("inventory_items")
    .select("quantity, price, color, has_variants")
    .eq("id", itemId)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!item) return { error: "Item not found." };
  if (item.has_variants) return { error: "This item already has options." };

  // Not wrapped in a single DB transaction (see createInventoryItemVariants above) --
  // if the variant insert fails, restore the item's original simple-item fields
  // rather than leave it flagged has_variants with zero variants.
  const { error: updateError } = await supabase
    .from("inventory_items")
    .update({
      has_variants: true,
      variant_label: v.variantLabel,
      quantity: 0,
      color: "",
      price: Math.min(...v.variants.map((variant) => variant.price)),
      updated_by: context.userId,
    })
    .eq("id", itemId)
    .eq("business_id", context.business.id)
    .eq("has_variants", false);

  if (updateError) return { error: updateError.message };

  const variantRows = v.variants.map((variant) => ({
    business_id: context.business.id,
    item_id: itemId,
    value: variant.value,
    price: variant.price,
    quantity: variant.quantity,
    created_by: context.userId,
    updated_by: context.userId,
  }));

  const { error: variantsError } = await supabase.from("inventory_item_variants").insert(variantRows);

  if (variantsError) {
    await supabase
      .from("inventory_items")
      .update({
        has_variants: false,
        variant_label: null,
        quantity: item.quantity,
        color: item.color,
        price: item.price,
        updated_by: context.userId,
      })
      .eq("id", itemId)
      .eq("business_id", context.business.id);
    return { error: variantsError.message };
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${itemId}`);
  return { error: null };
}

export async function addVariantToItem(
  itemId: string,
  values: { value: string; price: number; quantity: number }
): Promise<ActionResult> {
  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can add variants." };
  }
  if (!values.value.trim()) return { error: "Enter a value for this variant." };
  if (values.price < 0) return { error: "Price cannot be negative." };
  if (values.quantity < 0) return { error: "Quantity cannot be negative." };

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_item_variants").insert({
    business_id: context.business.id,
    item_id: itemId,
    value: values.value.trim(),
    price: values.price,
    quantity: values.quantity,
    created_by: context.userId,
    updated_by: context.userId,
  });

  if (error) {
    if (error.code === "23505") return { error: "This item already has a variant with that value." };
    return { error: error.message };
  }
  revalidatePath(`/inventory/${itemId}`);
  return { error: null };
}

export async function updateVariant(variantId: string, itemId: string, values: unknown): Promise<ActionResult> {
  const parsed = updateVariantSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid details." };

  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can edit variants." };
  }

  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_item_variants")
    .update({ value: v.value, price: v.price, updated_by: context.userId })
    .eq("id", variantId)
    .eq("business_id", context.business.id);

  if (error) {
    if (error.code === "23505") return { error: "This item already has a variant with that value." };
    return { error: error.message };
  }
  revalidatePath(`/inventory/${itemId}`);
  return { error: null };
}

export async function deleteVariant(variantId: string, itemId: string): Promise<ActionResult> {
  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can remove variants." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_item_variants")
    .delete()
    .eq("id", variantId)
    .eq("business_id", context.business.id);

  if (error) return { error: error.message };
  revalidatePath(`/inventory/${itemId}`);
  return { error: null };
}

export async function updateInventoryItem(
  itemId: string,
  values: unknown
): Promise<ActionResult> {
  const parsed = editInventoryItemSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid details." };

  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can edit inventory items." };
  }

  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update({
      name: v.name,
      category: v.category,
      color: v.color || "",
      sku: v.sku || null,
      description: v.description || null,
      image_url: v.imageUrl ?? null,
      cost: v.cost,
      price: v.price,
      low_stock_threshold: v.lowStockThreshold ?? null,
      updated_by: context.userId,
    })
    .eq("id", itemId)
    .eq("business_id", context.business.id);

  if (error) return { error: error.message };
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${itemId}`);
  return { error: null };
}

export async function setItemArchived(itemId: string, archived: boolean): Promise<ActionResult> {
  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can archive inventory items." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update({ status: archived ? "archived" : "active", updated_by: context.userId })
    .eq("id", itemId)
    .eq("business_id", context.business.id);

  if (error) return { error: error.message };
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${itemId}`);
  return { error: null };
}

export async function setItemsArchived(itemIds: string[], archived: boolean): Promise<ActionResult> {
  if (itemIds.length === 0) return { error: null };

  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can archive inventory items." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update({ status: archived ? "archived" : "active", updated_by: context.userId })
    .in("id", itemIds)
    .eq("business_id", context.business.id);

  if (error) return { error: error.message };
  revalidatePath("/inventory");
  return { error: null };
}

export async function renameCategory(oldName: string, newName: string): Promise<ActionResult> {
  const trimmed = newName.trim();
  if (!trimmed) return { error: "Enter a category name." };

  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can manage categories." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update({ category: trimmed, updated_by: context.userId })
    .eq("business_id", context.business.id)
    .eq("category", oldName);

  if (error) return { error: error.message };
  revalidatePath("/inventory");
  revalidatePath("/more/categories");
  revalidatePath("/sell");
  return { error: null };
}

export async function removeCategory(name: string): Promise<ActionResult> {
  const context = await getCurrentBusinessContext();
  if (!context) return { error: "You must belong to a business." };
  if (context.membership.role !== "owner") {
    return { error: "Only the business owner can manage categories." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update({ category: UNCATEGORIZED_CATEGORY, updated_by: context.userId })
    .eq("business_id", context.business.id)
    .eq("category", name);

  if (error) return { error: error.message };
  revalidatePath("/inventory");
  revalidatePath("/more/categories");
  revalidatePath("/sell");
  return { error: null };
}

export async function adjustInventory(
  itemId: string,
  values: unknown,
  variantId?: string | null
): Promise<ActionResult> {
  const parsed = adjustInventorySchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid details." };

  const v = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.rpc("adjust_inventory", {
    p_item_id: itemId,
    p_adjustment_type: v.adjustmentType,
    p_note: v.note || null,
    p_delta: v.mode === "set" ? null : v.mode === "increase" ? v.amount : -v.amount,
    p_set_to: v.mode === "set" ? v.amount : null,
    p_variant_id: variantId ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${itemId}`);
  return { error: null };
}
