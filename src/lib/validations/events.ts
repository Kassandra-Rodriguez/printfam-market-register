import { z } from "zod";

export const createEventSchema = z.object({
  name: z.string().trim().min(1, "Enter an event name"),
  eventDate: z.string().min(1, "Select a date"),
  startTime: z.string().trim().optional(),
  endTime: z.string().trim().optional(),
  location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
export type CreateEventValues = z.infer<typeof createEventSchema>;

export const closeEventSchema = z.object({
  startingCash: z.number().min(0).optional(),
  actualCash: z.number().min(0).optional(),
  note: z.string().trim().optional(),
});
export type CloseEventValues = z.infer<typeof closeEventSchema>;

export const cashCountSchema = z.object({
  startingCash: z.number().min(0),
  actualCash: z.number().min(0),
  note: z.string().trim().optional(),
});
export type CashCountValues = z.infer<typeof cashCountSchema>;

export const voidTransactionSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required"),
});
export type VoidTransactionValues = z.infer<typeof voidTransactionSchema>;
