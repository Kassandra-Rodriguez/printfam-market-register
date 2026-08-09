import { Home, ShoppingBag, Package, CalendarDays, Menu, BarChart3 } from "lucide-react";

// Bottom bar on phones: 5 slots, Sell emphasized. Reports lives in More +
// a Home quick link so the bar stays uncluttered (see plan assumptions).
export const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/sell", label: "Sell", icon: ShoppingBag },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/more", label: "More", icon: Menu },
] as const;

// Side rail on tablet/desktop has room for all primary sections.
export const FULL_NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/sell", label: "Sell", icon: ShoppingBag },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/more", label: "More", icon: Menu },
] as const;
