import { describe, expect, it } from "vitest";
import { adjustInventorySchema, ADJUSTMENT_TYPES } from "@/lib/validations/inventory";
import { signUpSchema } from "@/lib/validations/auth";
import { voidTransactionSchema } from "@/lib/validations/events";
import { updateBusinessSettingsSchema } from "@/lib/validations/settings";

describe("adjustInventorySchema", () => {
  it("requires a note for damaged/lost/other adjustment types", () => {
    for (const type of ["damaged", "lost", "other"] as const) {
      const result = adjustInventorySchema.safeParse({
        mode: "decrease",
        adjustmentType: type,
        amount: 1,
        note: "",
      });
      expect(result.success).toBe(false);
    }
  });

  it("does not require a note for stock_added/manual_correction/returned", () => {
    for (const type of ["stock_added", "manual_correction", "returned"] as const) {
      const result = adjustInventorySchema.safeParse({
        mode: "increase",
        adjustmentType: type,
        amount: 1,
        note: "",
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts a note for damaged/lost/other and passes validation", () => {
    const result = adjustInventorySchema.safeParse({
      mode: "decrease",
      adjustmentType: "damaged",
      amount: 2,
      note: "Box got wet in the rain",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative amounts", () => {
    const result = adjustInventorySchema.safeParse({
      mode: "increase",
      adjustmentType: "stock_added",
      amount: -1,
      note: "",
    });
    expect(result.success).toBe(false);
  });

  it("every adjustment type constant matches the database CHECK constraint's allowed values", () => {
    const allowed = ["stock_added", "manual_correction", "damaged", "lost", "returned", "other"];
    expect(ADJUSTMENT_TYPES.map((t) => t.value).sort()).toEqual(allowed.sort());
  });
});

describe("signUpSchema", () => {
  it("rejects a password under 8 characters", () => {
    const result = signUpSchema.safeParse({
      fullName: "Jamie Rivera",
      email: "jamie@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = signUpSchema.safeParse({
      fullName: "Jamie Rivera",
      email: "not-an-email",
      password: "password1234",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid sign-up details", () => {
    const result = signUpSchema.safeParse({
      fullName: "Jamie Rivera",
      email: "jamie@example.com",
      password: "password1234",
    });
    expect(result.success).toBe(true);
  });
});

describe("voidTransactionSchema", () => {
  it("requires a non-empty reason", () => {
    expect(voidTransactionSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(voidTransactionSchema.safeParse({ reason: "   " }).success).toBe(false);
  });

  it("accepts a real reason", () => {
    expect(voidTransactionSchema.safeParse({ reason: "Entered wrong item" }).success).toBe(true);
  });
});

describe("updateBusinessSettingsSchema", () => {
  it("rejects a void window outside 1-1440 minutes", () => {
    const base = {
      allowNegativeInventory: false,
      employeesCanAdjustInventory: false,
      employeesCanVoidOwnRecentTransactions: false,
      employeesCanManageEvents: false,
    };
    expect(updateBusinessSettingsSchema.safeParse({ ...base, voidWindowMinutes: 0 }).success).toBe(false);
    expect(updateBusinessSettingsSchema.safeParse({ ...base, voidWindowMinutes: 1441 }).success).toBe(false);
    expect(updateBusinessSettingsSchema.safeParse({ ...base, voidWindowMinutes: 60 }).success).toBe(true);
  });
});
