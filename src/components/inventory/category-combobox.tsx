"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, Plus } from "lucide-react";

export function CategoryCombobox({
  id,
  value,
  onChange,
  categories,
  placeholder = "Select a category",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? categories.filter((c) => c.toLowerCase().includes(normalizedQuery))
    : categories;
  const exactMatch = categories.some((c) => c.toLowerCase() === normalizedQuery);

  function select(category: string) {
    onChange(category);
    setQuery("");
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            className={cn(
              "flex h-12 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              !value && "text-muted-foreground"
            )}
          />
        }
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) p-1.5">
        <Input
          autoFocus
          placeholder="Search or add new..."
          className="mb-1.5 h-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => select(c)}
              className={cn(
                "rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent",
                c === value && "bg-accent font-medium"
              )}
            >
              {c}
            </button>
          ))}
          {filtered.length === 0 && !query.trim() && (
            <p className="px-2.5 py-2 text-sm text-muted-foreground">No categories yet.</p>
          )}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              onClick={() => select(query.trim())}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-left text-sm text-primary hover:bg-accent"
            >
              <Plus className="size-3.5" />
              Add &ldquo;{query.trim()}&rdquo;
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
