import { z } from "zod";

export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const;

export const CURRENCIES = [{ code: "USD", label: "US Dollar (USD)" }] as const;

export const createBusinessSchema = z.object({
  businessName: z.string().trim().min(1, "Enter your business name"),
  ownerName: z.string().trim().min(1, "Enter your name"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().optional(),
  defaultCurrency: z.string().min(1),
  timezone: z.string().min(1, "Select a time zone"),
  logoUrl: z.string().trim().optional(),
});
export type CreateBusinessValues = z.infer<typeof createBusinessSchema>;

export const inviteEmployeeSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});
export type InviteEmployeeValues = z.infer<typeof inviteEmployeeSchema>;
