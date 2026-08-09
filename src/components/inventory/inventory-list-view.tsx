"use client";

import * as React from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItemRow } from "@/components/inventory/item-row";
import { AlphabetIndex } from "@/components/inventory/alphabet-index";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/currency";
import { setItemsArchived } from "@/lib/actions/inventory";
import { Search, Package, X, Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { useRealtimeInventory } from "@/hooks/use-realtime-inventory";
import { useRealtimeVariants } from "@/hooks/use-realtime-variants";
import type { Database } from "@/types/database.types";

type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
type Variant = Database["public"]["Tables"]["inventory_item_variants"]["Row"];

function letterFor(name: string) {
  const first = name.trim()[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(first) ? first : "#";
}

export function InventoryListView({
  items: initialItems,
  variants: initialVariants,
  currency,
  businessId,
  isOwner,
}: {
  items: InventoryItem[];
  variants: Variant[];
  currency: string;
  businessId: string;
  isOwner: boolean;
}) {
  const [items, setItems] = React.useState(initialItems);
  const [variants, setVariants] = React.useState(initialVariants);
  useRealtimeInventory(businessId, setItems);
  useRealtimeVariants(businessId, setVariants);
  const [status, setStatus] = React.useState<"active" | "archived">("active");
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string | null>(null);
  const [color, setColor] = React.useState<string | null>(null);
  const [lowStockOnly, setLowStockOnly] = React.useState(false);
  const [selectMode, setSelectMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [applying, setApplying] = React.useState(false);

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyBulkArchive() {
    setApplying(true);
    const archived = status === "active";
    const result = await setItemsArchived(Array.from(selectedIds), archived);
    setApplying(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(archived ? "Items archived" : "Items restored");
    exitSelectMode();
  }

  const variantsByItem = React.useMemo(() => {
    const map = new Map<string, Variant[]>();
    for (const variant of variants) {
      const list = map.get(variant.item_id);
      if (list) list.push(variant);
      else map.set(variant.item_id, [variant]);
    }
    return map;
  }, [variants]);

  const quantityOf = React.useCallback(
    (item: InventoryItem) =>
      item.has_variants
        ? (variantsByItem.get(item.id) ?? []).reduce((sum, v) => sum + v.quantity, 0)
        : item.quantity,
    [variantsByItem]
  );

  const priceLabelOf = React.useCallback(
    (item: InventoryItem) => {
      if (!item.has_variants) return formatCurrency(item.price, currency);
      const prices = (variantsByItem.get(item.id) ?? []).map((v) => v.price);
      if (prices.length === 0) return formatCurrency(item.price, currency);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return min === max
        ? formatCurrency(min, currency)
        : `${formatCurrency(min, currency)}–${formatCurrency(max, currency)}`;
    },
    [variantsByItem, currency]
  );

  const categories = React.useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort(),
    [items]
  );
  const colors = React.useMemo(
    () =>
      Array.from(
        new Set(
          items.flatMap((i) =>
            i.has_variants
              ? (variantsByItem.get(i.id) ?? []).map((v) => v.value)
              : i.color
                ? [i.color]
                : []
          )
        )
      ).sort(),
    [items, variantsByItem]
  );

  const filtered = items.filter((item) => {
    if (item.status !== status) return false;
    if (category && item.category !== category) return false;
    const itemVariants = variantsByItem.get(item.id) ?? [];
    if (color) {
      const matchesColor = item.has_variants
        ? itemVariants.some((v) => v.value === color)
        : item.color === color;
      if (!matchesColor) return false;
    }
    const quantity = quantityOf(item);
    if (lowStockOnly && !(item.low_stock_threshold != null && quantity <= item.low_stock_threshold)) {
      return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const variantValues = itemVariants.map((v) => v.value).join(" ");
      const haystack = `${item.name} ${item.category} ${item.color} ${variantValues} ${item.sku ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const groups = React.useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    for (const item of filtered) {
      const letter = letterFor(item.name);
      const list = map.get(letter);
      if (list) list.push(item);
      else map.set(letter, [item]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const availableLetters = React.useMemo(() => new Set(groups.map(([letter]) => letter)), [groups]);

  function scrollToLetter(letter: string) {
    document.getElementById(`inv-letter-${letter}`)?.scrollIntoView({ block: "start" });
  }

  return (
    <div className="flex flex-col gap-3 pr-5 pb-16">
      <div className="flex items-center justify-between gap-2">
        <Tabs
          value={status}
          onValueChange={(v) => {
            exitSelectMode();
            setStatus(v as "active" | "archived");
          }}
        >
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        {isOwner && filtered.length > 0 && (
          <Button
            size="sm"
            variant={selectMode ? "secondary" : "outline"}
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          >
            {selectMode ? "Cancel" : "Select"}
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search inventory"
          className="h-10 pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {(categories.length > 0 || colors.length > 0) && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? null : c)}
              className="shrink-0"
            >
              <Badge variant={category === c ? "default" : "secondary"} className="cursor-pointer">
                {c}
              </Badge>
            </button>
          ))}
          {colors.map((c) => (
            <button key={c} onClick={() => setColor(color === c ? null : c)} className="shrink-0">
              <Badge variant={color === c ? "default" : "outline"} className="cursor-pointer capitalize">
                {c}
              </Badge>
            </button>
          ))}
        </div>
      )}

      <label className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
        <span className="text-sm font-medium">Low stock only</span>
        <Switch checked={lowStockOnly} onCheckedChange={setLowStockOnly} />
      </label>

      {selectMode && filtered.length > 0 && (
        <button
          type="button"
          className="self-start text-sm font-medium text-primary underline underline-offset-4"
          onClick={() =>
            setSelectedIds((prev) =>
              prev.size === filtered.length ? new Set() : new Set(filtered.map((i) => i.id))
            )
          }
        >
          {selectedIds.size === filtered.length ? "Deselect all" : `Select all ${filtered.length}`}
        </button>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={status === "active" ? "No matching items" : "Nothing archived"}
          description={
            status === "active"
              ? "Try a different search or filter."
              : "Archived items will show up here."
          }
        />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {groups.map(([letter, groupItems]) => (
            <div key={letter} id={`inv-letter-${letter}`} className="scroll-mt-24">
              <p className="bg-muted/60 px-4 py-1 text-xs font-bold text-muted-foreground">{letter}</p>
              <div className="divide-y">
                {groupItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    priceLabel={priceLabelOf(item)}
                    quantity={quantityOf(item)}
                    variantCount={variantsByItem.get(item.id)?.length ?? 0}
                    selectMode={selectMode}
                    selected={selectedIds.has(item.id)}
                    onToggleSelect={() => toggleSelected(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {groups.length > 5 && !selectMode && (
        <AlphabetIndex availableLetters={availableLetters} onSelect={scrollToLetter} />
      )}

      {selectMode && selectedIds.size > 0 && (
        <div className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-lg md:bottom-6">
          <span className="flex items-center gap-2 text-sm font-medium">
            <button type="button" onClick={exitSelectMode} aria-label="Cancel selection">
              <X className="size-4" />
            </button>
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={applying}
            onClick={applyBulkArchive}
          >
            {applying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : status === "active" ? (
              <Archive className="size-4" />
            ) : (
              <ArchiveRestore className="size-4" />
            )}
            {status === "active" ? "Archive" : "Restore"}
          </Button>
        </div>
      )}
    </div>
  );
}
