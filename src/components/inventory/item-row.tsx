import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Package, ChevronRight } from "lucide-react";
import type { Database } from "@/types/database.types";

type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];

export function ItemRow({
  item,
  priceLabel,
  quantity,
  variantCount,
  selectMode,
  selected,
  onToggleSelect,
}: {
  item: InventoryItem;
  priceLabel: string;
  quantity: number;
  variantCount?: number;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const isLow = item.low_stock_threshold != null && quantity <= item.low_stock_threshold;
  const isOut = quantity <= 0;

  const content = (
    <>
      {selectMode && (
        <Checkbox checked={!!selected} className="pointer-events-none shrink-0" aria-hidden />
      )}
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt="" className="size-full object-cover" />
        ) : (
          <Package className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.category}
          {item.has_variants
            ? ` · ${variantCount ?? 0} option${variantCount === 1 ? "" : "s"}`
            : item.color
              ? ` · ${item.color}`
              : ""}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-sm font-semibold">{priceLabel}</span>
        <Badge
          variant="secondary"
          className={cn(
            "px-1.5 py-0 text-[11px]",
            isOut && "bg-destructive/10 text-destructive",
            isLow && !isOut && "bg-warning/15 text-warning-foreground dark:text-warning"
          )}
        >
          {quantity} left
        </Badge>
      </div>
      {!selectMode && <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />}
    </>
  );

  if (selectMode) {
    return (
      <button
        type="button"
        onClick={onToggleSelect}
        className={cn("flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted", selected && "bg-primary/5")}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={`/inventory/${item.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-muted">
      {content}
    </Link>
  );
}
