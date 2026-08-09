import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name"),
  phone: z.string().trim().optional(),
  avatarUrl: z.string().trim().nullable().optional(),
});
export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;

export const updateBusinessProfileSchema = z.object({
  name: z.string().trim().min(1, "Enter your business name"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().optional(),
  timezone: z.string().min(1),
  logoUrl: z.string().trim().nullable().optional(),
});
export type UpdateBusinessProfileValues = z.infer<typeof updateBusinessProfileSchema>;

export const updateBusinessSettingsSchema = z.object({
  allowNegativeInventory: z.boolean(),
  employeesCanAdjustInventory: z.boolean(),
  employeesCanVoidOwnRecentTransactions: z.boolean(),
  employeesCanManageEvents: z.boolean(),
  voidWindowMinutes: z.number().int().min(1).max(1440),
});
export type UpdateBusinessSettingsValues = z.infer<typeof updateBusinessSettingsSchema>;
