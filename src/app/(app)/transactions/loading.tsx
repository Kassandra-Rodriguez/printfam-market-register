import { ListSkeleton } from "@/components/shared/grid-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <Skeleton className="mb-4 h-7 w-36" />
      <ListSkeleton />
    </div>
  );
}
