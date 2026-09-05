"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar-context";

/** Hamburger toggle for the business/product sidebar (standard collapsed-by-default
 * drawer convention) -- lives in the header, top-left, next to the logo. */
export function SidebarToggle() {
  const { open, setOpen } = useSidebar();

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-label={open ? "Close sidebar" : "Open sidebar"}
      aria-expanded={open}
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Menu className="size-5" aria-hidden="true" />
    </button>
  );
}
