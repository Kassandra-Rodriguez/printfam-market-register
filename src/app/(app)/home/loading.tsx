import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-4 md:py-6">
      <Skeleton className="mb-4 h-7 w-40" />
      <Skeleton className="mb-4 h-16 w-full rounded-xl" />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
