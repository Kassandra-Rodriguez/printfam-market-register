"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setItemArchived } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
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
import { Pencil, ArchiveRestore, Archive, SlidersHorizontal, History } from "lucide-react";

export function ItemActions({
  itemId,
  isOwner,
  canAdjust,
  isArchived,
  hasVariants,
}: {
  itemId: string;
  isOwner: boolean;
  canAdjust: boolean;
  isArchived: boolean;
  hasVariants?: boolean;
}) {
  const router = useRouter();

  async function handleArchiveToggle() {
    const result = await setItemArchived(itemId, !isArchived);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(isArchived ? "Item restored" : "Item archived");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {canAdjust && !isArchived && !hasVariants && (
        <Button
          render={<Link href={`/inventory/${itemId}/adjust`} />}
          size="lg"
          className="col-span-2 h-11"
        >
          <SlidersHorizontal /> Adjust quantity
        </Button>
      )}
      {isOwner && (
        <>
          <Button
            render={<Link href={`/inventory/${itemId}/edit`} />}
            variant="outline"
            className="h-11"
          >
            <Pencil /> Edit
          </Button>
          <Button render={<Link href={`/inventory/${itemId}/history`} />} variant="outline" className="h-11">
            <History /> History
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="outline"
                  className="col-span-2 h-11 text-destructive hover:text-destructive"
                />
              }
            >
              {isArchived ? <ArchiveRestore /> : <Archive />}
              {isArchived ? "Restore item" : "Archive item"}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isArchived ? "Restore this item?" : "Archive this item?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isArchived
                    ? "It will show up in your active inventory and Sell screen again."
                    : "It will be hidden from the Sell screen and active inventory, but its sales history stays intact. You can restore it anytime."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleArchiveToggle}>
                  {isArchived ? "Restore" : "Archive"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
