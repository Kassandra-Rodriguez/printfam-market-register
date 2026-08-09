"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { inventoryItemSchema } from "@/lib/validations/inventory";
import { createInventoryItem, updateInventoryItem } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/shared/image-upload";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

type FormValues = {
  name: string;
  category: string;
  color?: string;
  sku?: string;
  description?: string;
  imageUrl?: string | null;
  quantity: number;
  cost: number;
  price: number;
  lowStockThreshold?: number | null;
};

export function InventoryItemForm({
  mode,
  itemId,
  businessId,
  defaultValues,
}: {
  mode: "create" | "edit";
  itemId?: string;
  businessId: string;
  defaultValues?: Partial<FormValues>;
}) {
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      category: defaultValues?.category ?? "",
      color: defaultValues?.color ?? "",
      sku: defaultValues?.sku ?? "",
      description: defaultValues?.description ?? "",
      imageUrl: defaultValues?.imageUrl ?? null,
      quantity: defaultValues?.quantity ?? 0,
      cost: defaultValues?.cost ?? 0,
      price: defaultValues?.price ?? 0,
      lowStockThreshold: defaultValues?.lowStockThreshold ?? null,
    },
  });

  async function onSubmit(values: FormValues) {
    const result =
      mode === "create"
        ? await createInventoryItem(values)
        : await updateInventoryItem(itemId!, values);

    if (result.error) {
      form.setError("root", { message: result.error });
      return;
    }
    toast.success(mode === "create" ? "Item added" : "Item updated");
    if (mode === "create" && "itemId" in result && result.itemId) {
      router.push(`/inventory/${result.itemId}`);
    } else {
      router.push(`/inventory/${itemId}`);
    }
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <h2 className="-mb-1 text-sm font-semibold text-muted-foreground">Details</h2>
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Photo</FormLabel>
              <FormControl>
                <ImageUpload
                  bucket="inventory-images"
                  folder={businessId}
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item name</FormLabel>
              <FormControl>
                <Input placeholder="Mini dragon" className="h-12 text-base" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type / category</FormLabel>
                <FormControl>
                  <Input placeholder="Toy" className="h-12 text-base" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <Input placeholder="Purple" className="h-12 text-base" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <h2 className="-mb-1 text-sm font-semibold text-muted-foreground">Price &amp; stock</h2>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    inputMode="decimal"
                    className="h-12 text-base"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item cost</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    inputMode="decimal"
                    className="h-12 text-base"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {mode === "create" && (
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Starting quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    className="h-12 text-base"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="lowStockThreshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Low stock threshold (optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="e.g. 3"
                  className="h-12 text-base"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value === "" ? null : e.target.valueAsNumber)
                  }
                />
              </FormControl>
              <FormDescription>You&apos;ll see a low stock badge at or below this number.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU (optional)</FormLabel>
              <FormControl>
                <Input className="h-12 text-base" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
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
        <Button type="submit" size="lg" className="h-11 mt-1" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {mode === "create" ? "Add item" : "Save changes"}
        </Button>
      </form>
    </Form>
  );
}
