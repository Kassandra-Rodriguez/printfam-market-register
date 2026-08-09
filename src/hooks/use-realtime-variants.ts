"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type Variant = Database["public"]["Tables"]["inventory_item_variants"]["Row"];

// Mirrors useRealtimeInventory but for the child variants table, since
// quantity/value changes on a has_variants item happen on these rows instead
// of the parent inventory_items row.
export function useRealtimeVariants(
  businessId: string,
  onChange: (updater: (variants: Variant[]) => Variant[]) => void
) {
  React.useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`inventory-item-variants-${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_item_variants",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Variant;
            onChange((variants) => (variants.some((v) => v.id === row.id) ? variants : [...variants, row]));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Variant;
            onChange((variants) => variants.map((v) => (v.id === row.id ? row : v)));
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as Variant;
            onChange((variants) => variants.filter((v) => v.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);
}
