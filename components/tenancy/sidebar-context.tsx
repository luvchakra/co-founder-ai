"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

/** Shares the collapsible sidebar's open/closed state between the header's hamburger
 * toggle (sidebar-toggle.tsx) and the drawer itself (sidebar.tsx) -- they're siblings in
 * the dashboard layout, not nested, so a small client-side context is the simplest way to
 * connect them without lifting the businesses/products data up into a single component
 * that would also have to own header layout. Collapsed by default: the drawer only
 * expands once a person clicks the toggle. */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <SidebarContext.Provider value={{ open, setOpen }}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider");
  return context;
}
