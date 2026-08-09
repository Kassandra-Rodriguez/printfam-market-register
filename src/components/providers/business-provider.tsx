"use client";

import * as React from "react";
import type { Database } from "@/types/database.types";

type Business = Database["public"]["Tables"]["businesses"]["Row"];
type Membership = Database["public"]["Tables"]["business_members"]["Row"];
type Settings = Database["public"]["Tables"]["business_settings"]["Row"];

export type BusinessContextValue = {
  userId: string;
  business: Business;
  membership: Membership;
  settings: Settings;
  isOwner: boolean;
  canAdjustInventory: boolean;
  canManageEvents: boolean;
};

const BusinessContext = React.createContext<BusinessContextValue | null>(null);

export function BusinessProvider({
  value,
  children,
}: {
  value: {
    userId: string;
    business: Business;
    membership: Membership;
    settings: Settings;
  };
  children: React.ReactNode;
}) {
  const computed = React.useMemo<BusinessContextValue>(() => {
    const isOwner = value.membership.role === "owner";
    return {
      ...value,
      isOwner,
      canAdjustInventory: isOwner || value.settings.employees_can_adjust_inventory,
      canManageEvents: isOwner || value.settings.employees_can_manage_events,
    };
  }, [value]);

  return (
    <BusinessContext.Provider value={computed}>{children}</BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = React.useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider");
  return ctx;
}
