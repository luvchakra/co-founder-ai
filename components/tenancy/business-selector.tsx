"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActiveIdsFromPath } from "@/lib/tenancy/active-path";
import { useDismiss } from "@/hooks/use-dismiss";
import { CreateBusinessModal } from "./create-business-modal";
import type { Business } from "@/lib/tenancy/types";

/**
 * Header business switcher (CoFounderAI Header & Business Selector Enhancement doc §2-4)
 * -- distinct from the persistent Sidebar's business/product drill-down: this is the
 * quick "which business am I in" control that stays visible from anywhere in the
 * dashboard, including pages with no business in the URL at all (e.g. /dashboard/settings).
 * "+ Create New Business" is always rendered last, separated by a divider, never mixed
 * into the business list (doc §2's explicit requirement).
 */
export function BusinessSelector({
  businesses,
  createBusinessAction,
}: {
  businesses: Business[];
  createBusinessAction: (formData: FormData) => Promise<void>;
}) {
  const pathname = usePathname();
  const { businessId: activeBusinessId } = getActiveIdsFromPath(pathname);
  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) ?? null;

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useDismiss(containerRef, open, () => setOpen(false));

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex min-w-0 max-w-36 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-[background-color,transform] duration-100 hover:bg-accent active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:max-w-[16rem]"
        >
          <span className="truncate">{activeBusiness?.name ?? "Select Business"}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>

        {open ? (
          <div
            role="menu"
            className="fixed inset-x-3 top-14 z-50 mt-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:left-0 sm:mt-1 sm:w-64"
          >
            {businesses.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No businesses yet.</p>
            ) : (
              businesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/dashboard/businesses/${business.id}`}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center justify-between gap-2 truncate rounded-sm px-3 py-2 text-sm hover:bg-accent",
                    business.id === activeBusinessId && "font-medium",
                  )}
                >
                  <span className="truncate">{business.name}</span>
                  {business.id === activeBusinessId ? (
                    <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  ) : null}
                </Link>
              ))
            )}

            <div className="my-1 border-t" />

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setCreating(true);
              }}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-primary hover:bg-accent"
            >
              <Plus className="size-4" aria-hidden="true" />
              Create New Business
            </button>
          </div>
        ) : null}
      </div>

      {creating ? (
        <CreateBusinessModal action={createBusinessAction} onClose={() => setCreating(false)} />
      ) : null}
    </>
  );
}
