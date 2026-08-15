"use client";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
type Variant = Database["public"]["Tables"]["inventory_item_variants"]["Row"];

export function VariantPickerSheet({
  item,
  variants,
  cartQuantities,
  currency,
  allowNegative,
  onOpenChange,
  onSelect,
}: {
  item: InventoryItem | null;
  variants: Variant[];
  /** Quantity currently in the cart, keyed by variant id. */
  cartQuantities: Record<string, number>;
  currency: string;
  allowNegative: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (variantId: string) => void;
}) {
  return (
    <Sheet open={!!item} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[75svh]">
        <SheetHeader className="border-b pb-3">
          <SheetTitle>{item?.name ?? "Choose a variant"}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-2 overflow-y-auto py-3">
          {variants.map((variant) => {
            const inCart = cartQuantities[variant.id] ?? 0;
            const remaining = variant.quantity - inCart;
            const outOfStock = !allowNegative && remaining <= 0;
            return (
              <button
                key={variant.id}
                type="button"
                disabled={outOfStock}
                onClick={() => onSelect(variant.id)}
                className={cn(
                  "flex items-center justify-between rounded-lg border bg-card px-3 py-3 text-left active:bg-muted",
                  outOfStock && "opacity-50"
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {variant.value}
                  {inCart > 0 && (
                    <Badge variant="default" className="rounded-full px-1.5">
                      {inCart}
                    </Badge>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{formatCurrency(variant.price, currency)}</span>
                  <span className="text-xs text-muted-foreground">
                    {outOfStock ? "Out of stock" : `${remaining} left`}
                  </span>
                </span>
              </button>
            );
          })}
          {variants.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No variants set up.</p>
          )}
        </div>
        <SheetFooter className="border-t pt-3">
          <SheetClose render={<Button size="lg" className="h-11 w-full" />}>
            Add
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
