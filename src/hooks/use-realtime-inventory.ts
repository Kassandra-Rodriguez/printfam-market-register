"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];

// Keeps a locally-held inventory item list in sync with quantity/status
// changes made from any other logged-in device for the same business (sales,
// adjustments, voids, edits). Falls back silently to whatever was fetched on
// page load if the realtime connection drops -- a manual refresh still gets
// fresh data via the normal server-rendered fetch.
export function useRealtimeInventory(
  businessId: string,
  onChange: (updater: (items: InventoryItem[]) => InventoryItem[]) => void
) {
  React.useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`inventory-items-${businessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items", filter: `business_id=eq.${businessId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as InventoryItem;
            onChange((items) => (items.some((i) => i.id === row.id) ? items : [...items, row]));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as InventoryItem;
            onChange((items) => items.map((i) => (i.id === row.id ? row : i)));
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as InventoryItem;
            onChange((items) => items.filter((i) => i.id !== row.id));
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
