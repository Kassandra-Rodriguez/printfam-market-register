"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createInventoryItem, createInventoryItemVariants } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/shared/image-upload";
import { CategoryCombobox } from "@/components/inventory/category-combobox";
import { cn } from "@/lib/utils";
import { ArrowLeft, Package, Layers, Plus, Trash2, Loader2 } from "lucide-react";

type Variant = { value: string; price: number; quantity: number };

const STEP_PHOTO = 0;
const STEP_OPTIONS = 1;
const STEP_PRICING = 2;
const STEP_VARIANTS = 3;

export function AddItemWizard({
  businessId,
  categories,
}: {
  businessId: string;
  categories: string[];
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(STEP_PHOTO);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [hasOptions, setHasOptions] = React.useState<boolean | null>(null);
  const [price, setPrice] = React.useState(0);
  const [cost, setCost] = React.useState(0);
  const [quantity, setQuantity] = React.useState(0);
  const [color, setColor] = React.useState("");
  const [lowStockThreshold, setLowStockThreshold] = React.useState<number | null>(null);
  const [sku, setSku] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [variantLabel, setVariantLabel] = React.useState("Color");
  const [variants, setVariants] = React.useState<Variant[]>([
    { value: "", price: 0, quantity: 0 },
    { value: "", price: 0, quantity: 0 },
  ]);

  const totalSteps = hasOptions ? 4 : 3;
  const stepNumber = step + 1;

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, STEP_PHOTO));
  }

  function chooseOptions(value: boolean) {
    setHasOptions(value);
    setError(null);
    setStep(STEP_PRICING);
  }

  function updateVariant(index: number, patch: Partial<Variant>) {
    setVariants((v) => v.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const result = hasOptions
      ? await createInventoryItemVariants({
          name,
          category,
          sku,
          description,
          imageUrl,
          cost,
          lowStockThreshold,
          variants,
        })
      : await createInventoryItem({
          name,
          category,
          color,
          sku,
          description,
          imageUrl,
          quantity,
          cost,
          price,
          lowStockThreshold,
        });

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success("Item added");
    router.push("itemId" in result && result.itemId ? `/inventory/${result.itemId}` : "/inventory");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        {step > STEP_PHOTO ? (
          <Button type="button" variant="ghost" size="icon" className="-ml-2" onClick={goBack}>
            <ArrowLeft />
          </Button>
        ) : (
          <div className="size-9" />
        )}
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {step === STEP_PHOTO && (
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-lg font-semibold">What are you selling?</h1>
            <p className="text-sm text-muted-foreground">Add a photo and give it a name.</p>
          </div>
          <ImageUpload bucket="inventory-images" folder={businessId} value={imageUrl} onChange={setImageUrl} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="wiz-name">Item name</Label>
            <Input
              id="wiz-name"
              placeholder="Mini dragon"
              className="h-12 text-base"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="wiz-category">Type / category</Label>
            <CategoryCombobox
              id="wiz-category"
              placeholder="Toy"
              value={category}
              onChange={setCategory}
              categories={categories}
            />
          </div>
          <Button
            size="lg"
            className="h-12 text-base"
            disabled={!name.trim() || !category.trim()}
            onClick={() => setStep(STEP_OPTIONS)}
          >
            Next
          </Button>
        </div>
      )}

      {step === STEP_OPTIONS && (
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-lg font-semibold">Does it come in different options?</h1>
            <p className="text-sm text-muted-foreground">Like a color, size, or type customers pick from.</p>
          </div>
          <button
            type="button"
            onClick={() => chooseOptions(false)}
            className={cn(
              "flex items-center gap-4 rounded-2xl border-2 bg-card p-4 text-left active:scale-[0.98]",
              hasOptions === false ? "border-primary" : "border-transparent"
            )}
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Package className="size-6" />
            </div>
            <div>
              <p className="font-medium">No, just one</p>
              <p className="text-sm text-muted-foreground">This item is sold as-is.</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => chooseOptions(true)}
            className={cn(
              "flex items-center gap-4 rounded-2xl border-2 bg-card p-4 text-left active:scale-[0.98]",
              hasOptions === true ? "border-primary" : "border-transparent"
            )}
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Layers className="size-6" />
            </div>
            <div>
              <p className="font-medium">Yes, multiple options</p>
              <p className="text-sm text-muted-foreground">e.g. Red, Blue, Green &mdash; tracked separately.</p>
            </div>
          </button>
        </div>
      )}

      {step === STEP_PRICING && (
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-lg font-semibold">Price &amp; stock</h1>
            <p className="text-sm text-muted-foreground">
              {hasOptions
                ? "Cost applies to every option. You'll set each option's own price next."
                : "What does it cost, and how many do you have?"}
            </p>
          </div>
          <div className={cn("grid gap-3", hasOptions ? "grid-cols-1" : "grid-cols-2")}>
            {!hasOptions && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="wiz-price">Selling price</Label>
                <Input
                  id="wiz-price"
                  type="number"
                  step="0.01"
                  min={0}
                  inputMode="decimal"
                  className="h-12 text-base"
                  value={price || ""}
                  onChange={(e) => setPrice(e.target.valueAsNumber || 0)}
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="wiz-cost">Item cost</Label>
              <Input
                id="wiz-cost"
                type="number"
                step="0.01"
                min={0}
                inputMode="decimal"
                className="h-12 text-base"
                value={cost || ""}
                onChange={(e) => setCost(e.target.valueAsNumber || 0)}
              />
            </div>
          </div>
          {!hasOptions && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="wiz-quantity">Starting quantity</Label>
                <Input
                  id="wiz-quantity"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="h-12 text-base"
                  value={quantity || ""}
                  onChange={(e) => setQuantity(e.target.valueAsNumber || 0)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="wiz-color">Color (optional)</Label>
                <Input
                  id="wiz-color"
                  placeholder="Purple"
                  className="h-12 text-base"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="wiz-low-stock">Low stock alert (optional)</Label>
            <Input
              id="wiz-low-stock"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="e.g. 3"
              className="h-12 text-base"
              value={lowStockThreshold ?? ""}
              onChange={(e) => setLowStockThreshold(e.target.value === "" ? null : e.target.valueAsNumber)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="wiz-sku">SKU (optional)</Label>
            <Input id="wiz-sku" className="h-12 text-base" value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="wiz-description">Description (optional)</Label>
            <Textarea
              id="wiz-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button
            size="lg"
            className="h-12 text-base"
            disabled={submitting}
            onClick={() => (hasOptions ? setStep(STEP_VARIANTS) : handleSubmit())}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {hasOptions ? "Next: Add options" : "Add item"}
          </Button>
        </div>
      )}

      {step === STEP_VARIANTS && (
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-lg font-semibold">Add your options</h1>
            <p className="text-sm text-muted-foreground">
              Each one can have its own price and quantity &mdash; e.g. Small Bag $15, Large Bag $25.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="wiz-variant-label">Option name</Label>
            <Input
              id="wiz-variant-label"
              className="h-12 text-base"
              value={variantLabel}
              onChange={(e) => setVariantLabel(e.target.value || "Color")}
              placeholder="Color, Size, Type..."
            />
          </div>

          <div className="flex flex-col gap-3">
            {variants.map((row, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-xl border bg-card p-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={`${variantLabel || "Option"}, e.g. Black`}
                    className="h-12 flex-1 text-base"
                    value={row.value}
                    onChange={(e) => updateVariant(index, { value: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-12 shrink-0 text-muted-foreground"
                    disabled={variants.length <= 1}
                    onClick={() => setVariants((v) => v.filter((_, i) => i !== index))}
                    aria-label="Remove option"
                  >
                    <Trash2 />
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
                      className="h-12 text-base"
                      value={row.price || ""}
                      onChange={(e) => updateVariant(index, { price: e.target.valueAsNumber || 0 })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Quantity</Label>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      className="h-12 text-base"
                      value={row.quantity || ""}
                      onChange={(e) => updateVariant(index, { quantity: e.target.valueAsNumber || 0 })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setVariants((v) => [...v, { value: "", price: 0, quantity: 0 }])}
          >
            <Plus /> Add another {variantLabel.toLowerCase() || "option"}
          </Button>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button
            size="lg"
            className="h-12 text-base"
            disabled={submitting || variants.some((v) => !v.value.trim())}
            onClick={handleSubmit}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Add item
          </Button>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Step {stepNumber} of {totalSteps}
      </p>
    </div>
  );
}
