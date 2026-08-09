"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  voidTransactionSchema,
  type VoidTransactionValues,
} from "@/lib/validations/events";
import { voidTransaction } from "@/lib/actions/sales";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Ban } from "lucide-react";

export function VoidTransactionDialog({
  transactionId,
  compact = false,
}: {
  transactionId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const form = useForm<VoidTransactionValues>({
    resolver: zodResolver(voidTransactionSchema),
    defaultValues: { reason: "" },
  });

  async function onSubmit(values: VoidTransactionValues) {
    const result = await voidTransaction(transactionId, values);
    if (result.error) {
      form.setError("root", { message: result.error });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          compact ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label="Void transaction"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          ) : (
            <Button variant="outline" className="h-11 w-full text-destructive hover:text-destructive" />
          )
        }
      >
        {compact ? <Ban className="size-4" /> : (<><Ban /> Void transaction</>)}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void this transaction?</DialogTitle>
          <DialogDescription>
            The sold quantities will be returned to inventory and this sale will be
            removed from totals. The original record stays visible for the audit trail.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="e.g. Entered wrong item" {...field} />
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
            <DialogFooter>
              <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Void transaction
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
