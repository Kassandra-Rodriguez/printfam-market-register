import { ListSkeleton } from "@/components/shared/grid-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>
      <ListSkeleton />
    </div>
  );
}
