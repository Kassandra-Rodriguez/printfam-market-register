import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EventStatus } from "@/types/database.types";

const LABELS: Record<EventStatus, string> = {
  upcoming: "Upcoming",
  active: "Active",
  closed: "Closed",
};

export function EventStatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  return (
    <Badge
      className={cn(
        status === "active" && "bg-success/15 text-success-foreground dark:text-success",
        status === "upcoming" && "bg-warning/15 text-warning-foreground dark:text-warning",
        status === "closed" && "bg-muted text-muted-foreground",
        className
      )}
    >
      {status === "active" && (
        <span className="mr-1 inline-block size-1.5 rounded-full bg-current" />
      )}
      {LABELS[status]}
    </Badge>
  );
}
