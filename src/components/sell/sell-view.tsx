"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductTile } from "@/components/sell/product-tile";
import { CartSheet } from "@/components/sell/cart-sheet";
import { VariantPickerSheet } from "@/components/sell/variant-picker-sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { completeSale, voidTransaction } from "@/lib/actions/sales";
import { formatCurrency } from "@/lib/currency";
import { useRealtimeInventory } from "@/hooks/use-realtime-inventory";
import { useRealtimeVariants } from "@/hooks/use-realtime-variants";
import { Search, ShoppingBag, PackageSearch } from "lucide-react";
import type { Database } from "@/types/database.types";

type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
type Variant = Database["public"]["Tables"]["inventory_item_variants"]["Row"];
type PaymentMethod = Database["public"]["Tables"]["payment_methods"]["Row"];

export type CartLine = {
  /** itemId, or `${itemId}::${variantId}` for a variant line -- unique key for cart state. */
  lineKey: string;
  itemId: string;
  variantId: string | null;
  variantLabel?: string;
  name: string;
  price: number;
  quantity: number;
};

function lineKeyFor(itemId: string, variantId?: string | null) {
  return variantId ? `${itemId}::${variantId}` : itemId;
}

export function SellView({
  initialItems,
  initialVariants,
  eventId,
  businessId,
  paymentMethods,
  currency,
  allowNegativeInventory,
}: {
  initialItems: InventoryItem[];
  initialVariants: Variant[];
  eventId: string;
  businessId: string;
  paymentMethods: PaymentMethod[];
  currency: string;
  allowNegativeInventory: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);
  const [variants, setVariants] = React.useState(initialVariants);
  useRealtimeInventory(businessId, setItems);
  useRealtimeVariants(businessId, setVariants);
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string | null>(null);
  const [color, setColor] = React.useState<string | null>(null);
  const [cart, setCart] = React.useState<Record<string, number>>({});
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [pickerItemId, setPickerItemId] = React.useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<string>(paymentMethods[0]?.code ?? "cash");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const itemById = React.useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const variantById = React.useMemo(() => new Map(variants.map((v) => [v.id, v])), [variants]);
  const variantsByItem = React.useMemo(() => {
    const map = new Map<string, Variant[]>();
    for (const variant of variants) {
      const list = map.get(variant.item_id);
      if (list) list.push(variant);
      else map.set(variant.item_id, [variant]);
    }
    return map;
  }, [variants]);

  const categories = React.useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort(),
    [items]
  );
  const colors = React.useMemo(
    () =>
      Array.from(
        new Set(
          items.flatMap((i) =>
            i.has_variants ? (variantsByItem.get(i.id) ?? []).map((v) => v.value) : i.color ? [i.color] : []
          )
        )
      ).sort(),
    [items, variantsByItem]
  );

  const filtered = items.filter((item) => {
    if (item.status !== "active") return false;
    if (category && item.category !== category) return false;
    const itemVariants = variantsByItem.get(item.id) ?? [];
    if (color) {
      const matchesColor = item.has_variants
        ? itemVariants.some((v) => v.value === color)
        : item.color === color;
      if (!matchesColor) return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const variantValues = itemVariants.map((v) => v.value).join(" ");
      if (!`${item.name} ${item.category} ${item.color} ${variantValues}`.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Cart quantity aggregated per top-level item (across all its variant lines), for the tile badge.
  const cartQuantityByItem = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const [key, qty] of Object.entries(cart)) {
      const itemId = key.split("::")[0];
      map.set(itemId, (map.get(itemId) ?? 0) + qty);
    }
    return map;
  }, [cart]);

  // Cart quantity per variant id, for the picker sheet.
  const cartQuantityByVariant = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const [key, qty] of Object.entries(cart)) {
      const variantId = key.split("::")[1];
      if (variantId) map[variantId] = qty;
    }
    return map;
  }, [cart]);

  const lines: CartLine[] = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([lineKey, qty]) => {
      const [itemId, variantId] = lineKey.split("::");
      const item = itemById.get(itemId)!;
      const variant = variantId ? variantById.get(variantId) : undefined;
      return {
        lineKey,
        itemId,
        variantId: variantId ?? null,
        variantLabel: variant?.value,
        name: item.name,
        price: variant ? variant.price : item.price,
        quantity: qty,
      };
    });

  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  function priceLabelFor(item: InventoryItem) {
    if (!item.has_variants) return formatCurrency(item.price, currency);
    const prices = (variantsByItem.get(item.id) ?? []).map((v) => v.price);
    if (prices.length === 0) return formatCurrency(item.price, currency);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatCurrency(min, currency) : `${formatCurrency(min, currency)}+`;
  }

  function addToCart(itemId: string, variantId?: string | null) {
    const item = itemById.get(itemId);
    if (!item) return;
    const key = lineKeyFor(itemId, variantId);
    const currentQty = cart[key] ?? 0;
    const stock = variantId ? (variantById.get(variantId)?.quantity ?? 0) : item.quantity;
    if (!allowNegativeInventory && currentQty + 1 > stock) {
      toast.error("Not enough stock left");
      return;
    }
    setCart((c) => ({ ...c, [key]: currentQty + 1 }));
  }

  function handleTileTap(item: InventoryItem) {
    if (item.has_variants) {
      setPickerItemId(item.id);
      return;
    }
    addToCart(item.id);
  }

  function increment(lineKey: string) {
    const [itemId, variantId] = lineKey.split("::");
    addToCart(itemId, variantId ?? null);
  }

  function decrement(lineKey: string) {
    setCart((c) => {
      const next = { ...c };
      const qty = (next[lineKey] ?? 0) - 1;
      if (qty <= 0) delete next[lineKey];
      else next[lineKey] = qty;
      return next;
    });
  }

  function remove(lineKey: string) {
    setCart((c) => {
      const next = { ...c };
      delete next[lineKey];
      return next;
    });
  }

  async function handleComplete() {
    setSubmitting(true);
    const result = await completeSale(
      eventId,
      paymentMethod as "cash" | "cashapp" | "card",
      lines.map((l) => ({ inventoryItemId: l.itemId, variantId: l.variantId, quantity: l.quantity })),
      note
    );
    setSubmitting(false);

    if (result.error) {
      toast.error("Sale not saved", { description: result.error });
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        const soldQty = cartQuantityByItem.get(item.id);
        return soldQty && !item.has_variants
          ? { ...item, quantity: Math.max(item.quantity - soldQty, 0) }
          : item;
      })
    );
    setVariants((prev) =>
      prev.map((variant) => {
        const soldQty = cartQuantityByVariant[variant.id];
        return soldQty ? { ...variant, quantity: Math.max(variant.quantity - soldQty, 0) } : variant;
      })
    );
    setCart({});
    setNote("");
    setSheetOpen(false);
    const transactionId = result.transactionId;
    toast.success("Sale complete", {
      description: formatCurrency(subtotal, currency),
      action: transactionId
        ? {
            label: "Undo",
            onClick: () => handleUndo(transactionId),
          }
        : undefined,
    });
    router.refresh();
  }

  async function handleUndo(transactionId: string) {
    const result = await voidTransaction(transactionId, { reason: "Undone right after sale" });
    if (result.error) {
      toast.error("Couldn't undo that sale", { description: result.error });
      return;
    }
    toast.success("Sale undone", { description: "Inventory has been restored." });
    router.refresh();
  }

  const pickerItem = pickerItemId ? (itemById.get(pickerItemId) ?? null) : null;

  return (
    <div className="flex flex-col gap-3 pb-24">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products"
          className="h-11 pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {(categories.length > 0 || colors.length > 0) && (
        <div className={`grid gap-2 ${categories.length > 0 && colors.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
          {categories.length > 0 && (
            <Select value={category ?? "Category"} onValueChange={(v) => setCategory(v === "all" ? null : v)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {colors.length > 0 && (
            <Select value={color ?? "Colors"} onValueChange={(v) => setColor(v === "all" ? null : v)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All colors</SelectItem>
                {colors.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No matching items"
          description="Try a different search or filter, or add inventory first."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => {
            const quantityInCart = cartQuantityByItem.get(item.id) ?? 0;
            const remaining = item.has_variants
              ? (variantsByItem.get(item.id) ?? []).reduce((sum, v) => sum + v.quantity, 0) - quantityInCart
              : item.quantity - quantityInCart;
            return (
              <ProductTile
                key={item.id}
                item={item}
                quantityInCart={quantityInCart}
                remaining={remaining}
                priceLabel={priceLabelFor(item)}
                allowNegative={allowNegativeInventory}
                onTap={() => handleTileTap(item)}
              />
            );
          })}
        </div>
      )}

      {itemCount > 0 && (
        <button
          onClick={() => setSheetOpen(true)}
          className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-md items-center justify-between rounded-xl bg-primary px-4 py-3.5 text-primary-foreground shadow-lg md:bottom-6"
        >
          <span className="flex items-center gap-2 font-medium">
            <ShoppingBag className="size-4.5" />
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
          <span className="font-semibold">{formatCurrency(subtotal, currency)}</span>
        </button>
      )}

      <VariantPickerSheet
        item={pickerItem}
        variants={pickerItemId ? (variantsByItem.get(pickerItemId) ?? []) : []}
        cartQuantities={cartQuantityByVariant}
        currency={currency}
        allowNegative={allowNegativeInventory}
        onOpenChange={(open) => !open && setPickerItemId(null)}
        onSelect={(variantId) => {
          if (pickerItemId) addToCart(pickerItemId, variantId);
        }}
      />

      <CartSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        lines={lines}
        currency={currency}
        paymentMethods={paymentMethods}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        note={note}
        onNoteChange={setNote}
        onIncrement={increment}
        onDecrement={decrement}
        onRemove={remove}
        onComplete={handleComplete}
        submitting={submitting}
      />
    </div>
  );
}
