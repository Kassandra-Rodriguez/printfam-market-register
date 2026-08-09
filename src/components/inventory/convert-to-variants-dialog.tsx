"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { convertItemToVariants } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Trash2, Layers, Loader2 } from "lucide-react";

type Row = { value: string; price: number; quantity: number };

export function ConvertToVariantsDialog({
  itemId,
  initialValue,
  initialPrice,
  initialQuantity,
}: {
  itemId: string;
  initialValue: string;
  initialPrice: number;
  initialQuantity: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [variantLabel, setVariantLabel] = React.useState("Color");
  const [rows, setRows] = React.useState<Row[]>([
    { value: initialValue, price: initialPrice, quantity: initialQuantity },
  ]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const result = await convertItemToVariants(itemId, { variantLabel, variants: rows });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success("Options added");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="h-11 w-full" />}>
        <Layers /> Add options (color, size, etc.)
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add options to this item</DialogTitle>
          <DialogDescription>
            Your current stock and price carry over as the first option below — add more as needed.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="convert-variant-label">Option name</Label>
            <Input
              id="convert-variant-label"
              value={variantLabel}
              onChange={(e) => setVariantLabel(e.target.value || "Color")}
              placeholder="Color, Size, Type..."
            />
          </div>

          <div className="flex flex-col gap-3">
            {rows.map((row, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-xl border bg-card p-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={`${variantLabel || "Option"}, e.g. Black`}
                    className="flex-1"
                    value={row.value}
                    onChange={(e) => updateRow(index, { value: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground"
                    disabled={rows.length <= 1}
                    onClick={() => setRows((r) => r.filter((_, i) => i !== index))}
                    aria-label="Remove option"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      inputMode="decimal"
                      value={row.price || ""}
                      onChange={(e) => updateRow(index, { price: e.target.valueAsNumber || 0 })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Quantity</Label>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={row.quantity || ""}
                      onChange={(e) => updateRow(index, { quantity: e.target.valueAsNumber || 0 })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setRows((r) => [...r, { value: "", price: 0, quantity: 0 }])}
          >
            <Plus /> Add another {variantLabel.toLowerCase() || "option"}
          </Button>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button type="button" disabled={submitting || rows.some((r) => !r.value.trim())} onClick={handleSubmit}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
