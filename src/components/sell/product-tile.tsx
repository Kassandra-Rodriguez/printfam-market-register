"use client";

import { Package, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];

export function ProductTile({
  item,
  quantityInCart,
  remaining,
  priceLabel,
  allowNegative,
  onTap,
}: {
  item: InventoryItem;
  /** Total quantity of this item across all its variants (or itself) currently in the cart. */
  quantityInCart: number;
  /** Remaining stock: aggregate across variants when has_variants, else item.quantity minus cart. */
  remaining: number;
  /** Formatted price, or a range like "$15.00–$25.00" when variant prices differ. */
  priceLabel: string;
  allowNegative: boolean;
  onTap: () => void;
}) {
  const outOfStock = !allowNegative && remaining <= 0;
  const isLow = !outOfStock && remaining <= 3;

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={outOfStock}
      className={cn(
        "group relative flex aspect-[4/5] flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-transform active:scale-[0.96]",
        outOfStock && "opacity-50"
      )}
    >
      {quantityInCart > 0 && (
        <span className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow">
          {quantityInCart}
        </span>
      )}

      <div className="relative flex-1 items-center justify-center overflow-hidden bg-muted">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            {item.has_variants ? (
              <Layers className="size-9 text-muted-foreground" />
            ) : (
              <Package className="size-9 text-muted-foreground" />
            )}
          </div>
        )}
        {outOfStock && (
          <span className="absolute inset-x-0 bottom-0 bg-background/90 py-1 text-center text-xs font-semibold">
            Out of stock
          </span>
        )}
        {!outOfStock && isLow && (
          <span className="absolute inset-x-0 bottom-0 bg-warning/85 py-1 text-center text-xs font-semibold text-warning-foreground">
            {remaining} left
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-2.5 py-2">
        <p className="min-w-0 truncate text-sm font-semibold leading-tight">{item.name}</p>
        <span className="shrink-0 text-sm font-bold">{priceLabel}</span>
      </div>
    </button>
  );
}
