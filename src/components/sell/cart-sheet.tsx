"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/currency";
import { Minus, Plus, Trash2, Loader2, Banknote, Smartphone, CreditCard } from "lucide-react";
import type { CartLine } from "@/components/sell/sell-view";
import type { Database } from "@/types/database.types";

type PaymentMethod = Database["public"]["Tables"]["payment_methods"]["Row"];

const PAYMENT_ICONS: Record<string, React.ElementType> = {
  cash: Banknote,
  cashapp: Smartphone,
  card: CreditCard,
};

export function CartSheet({
  open,
  onOpenChange,
  lines,
  currency,
  paymentMethods,
  paymentMethod,
  onPaymentMethodChange,
  note,
  onNoteChange,
  onIncrement,
  onDecrement,
  onRemove,
  onComplete,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: CartLine[];
  currency: string;
  paymentMethods: PaymentMethod[];
  paymentMethod: string;
  onPaymentMethodChange: (code: string) => void;
  note: string;
  onNoteChange: (note: string) => void;
  onIncrement: (lineKey: string) => void;
  onDecrement: (lineKey: string) => void;
  onRemove: (lineKey: string) => void;
  onComplete: () => void;
  submitting: boolean;
}) {
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[85svh] flex-col p-0">
        <SheetHeader className="border-b pb-3">
          <SheetTitle>Current sale</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-4">
          <div className="flex flex-col gap-3 py-3">
            {lines.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No items yet. Tap products to add them.
              </p>
            ) : (
              lines.map((line) => (
                <div key={line.lineKey} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {line.name}
                      {line.variantLabel ? ` · ${line.variantLabel}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(line.price, currency)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => onDecrement(line.lineKey)}
                      aria-label="Decrease quantity"
                    >
                      <Minus />
                    </Button>
                    <span className="w-6 text-center text-sm tabular-nums">{line.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => onIncrement(line.lineKey)}
                      aria-label="Increase quantity"
                    >
                      <Plus />
                    </Button>
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm font-semibold">
                    {formatCurrency(line.price * line.quantity, currency)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                    onClick={() => onRemove(line.lineKey)}
                    aria-label="Remove item"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))
            )}

            {lines.length > 0 && (
              <>
                <div className="border-t pt-3">
                  <Label className="mb-2 block text-sm font-medium">Payment method</Label>
                  <RadioGroup value={paymentMethod} onValueChange={onPaymentMethodChange} className="gap-2">
                    {paymentMethods.map((pm) => {
                      const Icon = PAYMENT_ICONS[pm.code] ?? Banknote;
                      return (
                        <label
                          key={pm.code}
                          htmlFor={`pm-${pm.code}`}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                        >
                          <Icon className="size-4.5 text-muted-foreground" />
                          <span className="flex-1 text-sm font-medium">{pm.label}</span>
                          <RadioGroupItem value={pm.code} id={`pm-${pm.code}`} />
                        </label>
                      );
                    })}
                  </RadioGroup>
                </div>
                <div>
                  <Label htmlFor="sale-note" className="mb-2 block text-sm font-medium">
                    Note (optional)
                  </Label>
                  <Textarea
                    id="sale-note"
                    rows={2}
                    placeholder="e.g. Customer requested gift wrap"
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>
        <SheetFooter className="border-t">
          <div className="mb-2 flex items-center justify-between text-base font-semibold">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          <Button
            size="lg"
            className="h-12 w-full text-base"
            disabled={lines.length === 0 || submitting}
            onClick={onComplete}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Complete sale
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
