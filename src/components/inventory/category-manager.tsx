"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { renameCategory, removeCategory } from "@/lib/actions/inventory";
import { UNCATEGORIZED_CATEGORY } from "@/lib/validations/inventory";
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
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Pencil, Trash2, Tags, Loader2 } from "lucide-react";

type Category = { name: string; itemCount: number };

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [renaming, setRenaming] = React.useState<Category | null>(null);
  const [newName, setNewName] = React.useState("");
  const [deleting, setDeleting] = React.useState<Category | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function openRename(category: Category) {
    setRenaming(category);
    setNewName(category.name);
  }

  async function handleRename() {
    if (!renaming) return;
    setSubmitting(true);
    const result = await renameCategory(renaming.name, newName);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Category renamed");
    setRenaming(null);
    router.refresh();
  }

  async function handleRemove() {
    if (!deleting) return;
    setSubmitting(true);
    const result = await removeCategory(deleting.name);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Category removed");
    setDeleting(null);
    router.refresh();
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={Tags}
        title="No categories yet"
        description="Categories show up here once you add one to an item."
      />
    );
  }

  return (
    <>
      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {categories.map((category) => (
          <div key={category.name} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{category.name}</p>
              <p className="text-xs text-muted-foreground">
                {category.itemCount} item{category.itemCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Rename ${category.name}`}
                onClick={() => openRename(category)}
              >
                <Pencil className="size-4" />
              </Button>
              {category.name !== UNCATEGORIZED_CATEGORY && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  aria-label={`Remove ${category.name}`}
                  onClick={() => setDeleting(category)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename category</DialogTitle>
            <DialogDescription>
              Updates every item currently in &ldquo;{renaming?.name}&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-rename">Category name</Label>
            <Input id="category-rename" autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" disabled={submitting || !newName.trim()} onClick={handleRename}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove &ldquo;{deleting?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.itemCount ?? 0} item{deleting?.itemCount === 1 ? "" : "s"} will move to &ldquo;
              {UNCATEGORIZED_CATEGORY}&rdquo;. This won&apos;t change prices, stock, or anything else about them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
