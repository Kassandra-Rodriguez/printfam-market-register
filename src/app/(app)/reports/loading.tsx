import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-4 md:py-6">
      <Skeleton className="mb-4 h-7 w-28" />
      <Skeleton className="mb-4 h-9 w-full" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
