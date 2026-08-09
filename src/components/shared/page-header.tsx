import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  backHref,
  action,
  className,
}: {
  title: string;
  backHref?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex min-w-0 items-center gap-2", className)}>
      {backHref && (
        <Link
          href={backHref}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Back"
        >
          <ChevronLeft className="size-5" />
        </Link>
      )}
      <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight">{title}</h1>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
