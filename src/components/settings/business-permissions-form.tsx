"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  updateBusinessSettingsSchema,
  type UpdateBusinessSettingsValues,
} from "@/lib/validations/settings";
import { updateBusinessSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function BusinessPermissionsForm({
  initial,
}: {
  initial: UpdateBusinessSettingsValues;
}) {
  const form = useForm<UpdateBusinessSettingsValues>({
    resolver: zodResolver(updateBusinessSettingsSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: UpdateBusinessSettingsValues) {
    const result = await updateBusinessSettings(values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Settings updated");
  }

  const watched = useWatch({ control: form.control });
  const values = { ...initial, ...watched };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
      <div className="divide-y rounded-xl border bg-card px-4">
        <ToggleRow
          label="Allow negative inventory"
          description="Let sales go through even if it oversells an item's stock."
          checked={values.allowNegativeInventory}
          onCheckedChange={(v) => form.setValue("allowNegativeInventory", v)}
        />
        <ToggleRow
          label="Employees can adjust inventory"
          description="Let employees add, correct, or write off stock, not just sell it."
          checked={values.employeesCanAdjustInventory}
          onCheckedChange={(v) => form.setValue("employeesCanAdjustInventory", v)}
        />
        <ToggleRow
          label="Employees can manage events"
          description="Let employees create, start, close, and reopen events."
          checked={values.employeesCanManageEvents}
          onCheckedChange={(v) => form.setValue("employeesCanManageEvents", v)}
        />
        <ToggleRow
          label="Employees can void their own sales"
          description="Let employees void a sale they just entered, within a time limit."
          checked={values.employeesCanVoidOwnRecentTransactions}
          onCheckedChange={(v) => form.setValue("employeesCanVoidOwnRecentTransactions", v)}
        />
        {values.employeesCanVoidOwnRecentTransactions && (
          <div className="flex items-center justify-between gap-4 py-3.5">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Void time window</Label>
              <p className="text-xs text-muted-foreground">
                Minutes after a sale during which an employee may void it.
              </p>
            </div>
            <Input
              type="number"
              min={1}
              max={1440}
              className="h-9 w-20 text-center"
              {...form.register("voidWindowMinutes", { valueAsNumber: true })}
            />
          </div>
        )}
      </div>
      <Button type="submit" size="lg" className="h-11 mt-4" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
        Save permissions
      </Button>
    </form>
  );
}
