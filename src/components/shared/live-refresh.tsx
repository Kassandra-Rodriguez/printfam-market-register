"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Invisible helper: re-fetches the current server-rendered page whenever a
// relevant row changes for this business (new/voided transaction, event
// status change), so recap numbers and event status stay live across every
// logged-in device without a manual reload. Debounced so a burst of changes
// (e.g. several sale line items) only triggers one refresh.
export function LiveRefresh({ businessId, tables }: { businessId: string; tables: string[] }) {
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createClient();
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => router.refresh(), 400);
    };

    const channel = supabase.channel(`live-refresh-${businessId}-${tables.join("-")}`);
    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `business_id=eq.${businessId}` },
        scheduleRefresh
      );
    }
    channel.subscribe();

    return () => {
      if (timeout) clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, tables.join(",")]);

  return null;
}
