import { z } from "zod";

export const ADJUSTMENT_TYPES = [
  { value: "stock_added", label: "Stock added", noteRequired: false },
  { value: "manual_correction", label: "Manual correction", noteRequired: false },
  { value: "damaged", label: "Damaged", noteRequired: true },
  { value: "lost", label: "Lost", noteRequired: true },
  { value: "returned", label: "Returned", noteRequired: false },
  { value: "other", label: "Other", noteRequired: true },
] as const;

export type AdjustmentTypeValue = (typeof ADJUSTMENT_TYPES)[number]["value"];

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, "Enter an item name"),
  category: z.string().trim().min(1, "Enter a type or category"),
  color: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().nullable().optional(),
  quantity: z.number().int().min(0, "Quantity cannot be negative"),
  cost: z.number().min(0, "Cost cannot be negative"),
  price: z.number().min(0, "Price cannot be negative"),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
});
export type InventoryItemValues = z.infer<typeof inventoryItemSchema>;

export const editInventoryItemSchema = inventoryItemSchema.omit({ quantity: true });
export type EditInventoryItemValues = z.infer<typeof editInventoryItemSchema>;

export const addVariantsSchema = z.object({
  name: z.string().trim().min(1, "Enter an item name"),
  category: z.string().trim().min(1, "Enter a type or category"),
  sku: z.string().trim().optional(),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().nullable().optional(),
  cost: z.number().min(0, "Cost cannot be negative"),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
  variants: z
    .array(
      z.object({
        value: z.string().trim().min(1, "Enter a value"),
        price: z.number().min(0, "Price cannot be negative"),
        quantity: z.number().int().min(0, "Quantity cannot be negative"),
      })
    )
    .min(1, "Add at least one variant"),
});
export type AddVariantsValues = z.infer<typeof addVariantsSchema>;

export const updateVariantSchema = z.object({
  value: z.string().trim().min(1, "Enter a value"),
  price: z.number().min(0, "Price cannot be negative"),
});
export type UpdateVariantValues = z.infer<typeof updateVariantSchema>;

export const adjustInventorySchema = z
  .object({
    mode: z.enum(["increase", "decrease", "set"]),
    adjustmentType: z.enum([
      "stock_added",
      "manual_correction",
      "damaged",
      "lost",
      "returned",
      "other",
    ]),
    amount: z.number().int().min(0, "Enter a quantity"),
    note: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      const requiresNote = ADJUSTMENT_TYPES.find(
        (t) => t.value === data.adjustmentType
      )?.noteRequired;
      return !requiresNote || (data.note && data.note.length > 0);
    },
    { message: "A note is required for this adjustment type", path: ["note"] }
  );
export type AdjustInventoryValues = z.infer<typeof adjustInventorySchema>;
