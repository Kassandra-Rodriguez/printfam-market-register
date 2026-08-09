"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  adjustInventorySchema,
  type AdjustInventoryValues,
  ADJUSTMENT_TYPES,
} from "@/lib/validations/inventory";
import { adjustInventory } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

export function AdjustInventoryForm({
  itemId,
  itemName,
  currentQuantity,
  variantId,
}: {
  itemId: string;
  itemName: string;
  currentQuantity: number;
  variantId?: string;
}) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(adjustInventorySchema),
    defaultValues: {
      mode: "increase" as const,
      adjustmentType: "stock_added" as const,
      amount: 1,
      note: "",
    },
  });

  const mode = useWatch({ control: form.control, name: "mode" }) ?? "increase";
  const amount = useWatch({ control: form.control, name: "amount" }) ?? 0;
  const adjustmentType =
    useWatch({ control: form.control, name: "adjustmentType" }) ?? "stock_added";
  const noteRequired = ADJUSTMENT_TYPES.find((t) => t.value === adjustmentType)?.noteRequired;

  const preview =
    mode === "set" ? amount : mode === "increase" ? currentQuantity + amount : currentQuantity - amount;

  async function onSubmit(values: AdjustInventoryValues) {
    const result = await adjustInventory(itemId, values, variantId ?? null);
    if (result.error) {
      form.setError("root", { message: result.error });
      return;
    }
    toast.success("Inventory updated");
    router.push(`/inventory/${itemId}`);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">{itemName}</p>
          <p className="text-3xl font-semibold tabular-nums">{currentQuantity}</p>
          <p className="text-xs text-muted-foreground">currently in stock</p>
        </div>

        <FormField
          control={form.control}
          name="mode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adjustment</FormLabel>
              <Tabs value={field.value} onValueChange={field.onChange}>
                <TabsList className="w-full">
                  <TabsTrigger value="increase" className="flex-1">
                    Increase
                  </TabsTrigger>
                  <TabsTrigger value="decrease" className="flex-1">
                    Decrease
                  </TabsTrigger>
                  <TabsTrigger value="set" className="flex-1">
                    Set exact
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{mode === "set" ? "New quantity" : "Amount"}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="h-12 text-center text-lg"
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="-mt-2 text-center text-sm text-muted-foreground">
          New quantity will be <span className="font-medium text-foreground">{Math.max(preview, 0)}</span>
        </p>

        <FormField
          control={form.control}
          name="adjustmentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ADJUSTMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Note {noteRequired ? "" : <span className="text-muted-foreground">(optional)</span>}
              </FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <Button type="submit" size="lg" className="h-11 mt-1" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Save adjustment
        </Button>
      </form>
    </Form>
  );
}
