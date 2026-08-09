"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addVariantToItem, updateVariant, deleteVariant } from "@/lib/actions/inventory";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, SlidersHorizontal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type Variant = Database["public"]["Tables"]["inventory_item_variants"]["Row"];

export function VariantManager({
  itemId,
  variants,
  currency,
  isOwner,
  canAdjust,
  isArchived,
}: {
  itemId: string;
  variants: Variant[];
  currency: string;
  isOwner: boolean;
  canAdjust: boolean;
  isArchived: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Variant | null>(null);

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Variants</h2>
        {isOwner && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" />}>
              <Plus /> Add variant
            </DialogTrigger>
            <DialogContent>
              <AddVariantForm itemId={itemId} onDone={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {variants.length === 0 && (
          <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
            No variants yet.
          </p>
        )}
        {variants.map((variant) => {
          const isOut = variant.quantity <= 0;
          return (
            <div
              key={variant.id}
              className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{variant.value}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(variant.price, currency)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Badge variant="secondary" className={cn(isOut && "bg-destructive/10 text-destructive")}>
                  {variant.quantity} left
                </Badge>
                {canAdjust && !isArchived && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    render={<Link href={`/inventory/${itemId}/adjust?variant=${variant.id}`} />}
                  >
                    <SlidersHorizontal className="size-4" />
                  </Button>
                )}
                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button size="icon" variant="ghost" className="size-8" />}>
                      <MoreVertical className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditTarget(variant)}>Edit</DropdownMenuItem>
                      <DeleteVariantMenuItem itemId={itemId} variant={variant} />
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          {editTarget && (
            <EditVariantForm
              itemId={itemId}
              variant={editTarget}
              onDone={() => {
                setEditTarget(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddVariantForm({ itemId, onDone }: { itemId: string; onDone: () => void }) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [price, setPrice] = React.useState(0);
  const [quantity, setQuantity] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await addVariantToItem(itemId, { value, price, quantity });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success("Variant added");
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Add variant</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="variant-value">Value</Label>
        <Input
          id="variant-value"
          placeholder="e.g. Red, Large"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="variant-price">Price</Label>
          <Input
            id="variant-price"
            type="number"
            step="0.01"
            min={0}
            inputMode="decimal"
            value={price || ""}
            onChange={(e) => setPrice(e.target.valueAsNumber || 0)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="variant-quantity">Quantity</Label>
          <Input
            id="variant-quantity"
            type="number"
            min={0}
            inputMode="numeric"
            value={quantity || ""}
            onChange={(e) => setQuantity(e.target.valueAsNumber || 0)}
          />
        </div>
      </div>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={submitting || !value.trim()}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Add
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditVariantForm({
  itemId,
  variant,
  onDone,
}: {
  itemId: string;
  variant: Variant;
  onDone: () => void;
}) {
  const [value, setValue] = React.useState(variant.value);
  const [price, setPrice] = React.useState(variant.price);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await updateVariant(variant.id, itemId, { value, price });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success("Variant updated");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Edit variant</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-variant-value">Value</Label>
        <Input
          id="edit-variant-value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-variant-price">Price</Label>
        <Input
          id="edit-variant-price"
          type="number"
          step="0.01"
          min={0}
          inputMode="decimal"
          value={price || ""}
          onChange={(e) => setPrice(e.target.valueAsNumber || 0)}
        />
      </div>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={submitting || !value.trim()}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

function DeleteVariantMenuItem({ itemId, variant }: { itemId: string; variant: Variant }) {
  const router = useRouter();

  async function handleDelete() {
    const result = await deleteVariant(variant.id, itemId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Variant removed");
    router.refresh();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<DropdownMenuItem variant="destructive" closeOnClick={false} />}>
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{variant.value}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the variant from this item. Past sales and adjustments keep their record of it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
