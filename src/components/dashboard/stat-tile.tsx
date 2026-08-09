import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: "default" | "warning" | "destructive";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </div>
      <p
        className={cn(
          "text-xl font-semibold tabular-nums",
          tone === "warning" && "text-warning",
          tone === "destructive" && "text-destructive"
        )}
      >
        {value}
      </p>
    </div>
  );
}
