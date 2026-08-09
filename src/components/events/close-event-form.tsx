"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { closeEventSchema, type CloseEventValues } from "@/lib/validations/events";
import { closeEvent } from "@/lib/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

export function CloseEventForm({ eventId, recordedCashSales, currency }: {
  eventId: string;
  recordedCashSales: number;
  currency: string;
}) {
  const router = useRouter();
  const form = useForm<CloseEventValues>({
    resolver: zodResolver(closeEventSchema),
    defaultValues: { startingCash: 0, actualCash: undefined, note: "" },
  });

  async function onSubmit(values: CloseEventValues) {
    const result = await closeEvent(eventId, values);
    if (result.error) {
      form.setError("root", { message: result.error });
      return;
    }
    router.push(`/events/${eventId}`);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Recorded cash sales for this event:{" "}
          <span className="font-medium text-foreground">
            {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(recordedCashSales)}
          </span>
        </p>
        <FormField
          control={form.control}
          name="startingCash"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Starting cash (optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  inputMode="decimal"
                  className="h-11"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
                />
              </FormControl>
              <FormDescription>Cash you started the event with, if any.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="actualCash"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Actual cash counted (optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  inputMode="decimal"
                  className="h-11"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
                />
              </FormControl>
              <FormDescription>Count your cash box and enter the total to see any difference.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Closing note (optional)</FormLabel>
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
          Close event
        </Button>
      </form>
    </Form>
  );
}
