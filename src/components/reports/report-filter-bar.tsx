"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom range" },
];

export function ReportFilterBar({
  events,
  employees,
}: {
  events: { id: string; name: string }[];
  employees: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const range = searchParams.get("range") ?? "today";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const event = searchParams.get("event") ?? "all";
  const employee = searchParams.get("employee") ?? "all";
  const payment = searchParams.get("payment") ?? "all";

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {RANGE_OPTIONS.map((opt) => (
          <button key={opt.value} onClick={() => update("range", opt.value)} className="shrink-0">
            <span
              className={`inline-flex h-8 items-center rounded-full border px-3 text-sm ${
                range === opt.value ? "border-primary bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              {opt.label}
            </span>
          </button>
        ))}
      </div>

      {range === "custom" && (
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" className="h-10" value={from} onChange={(e) => update("from", e.target.value)} />
          <Input type="date" className="h-10" value={to} onChange={(e) => update("to", e.target.value)} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Select value={event} onValueChange={(v) => update("event", v)}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={employee} onValueChange={(v) => update("employee", v)}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={payment} onValueChange={(v) => update("payment", v)}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="cashapp">Cash App</SelectItem>
            <SelectItem value="card">Card</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
