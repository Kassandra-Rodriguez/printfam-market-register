import { GridSkeleton } from "@/components/shared/grid-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-4 md:py-6">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="mb-3 h-11 w-full" />
      <GridSkeleton />
    </div>
  );
}
