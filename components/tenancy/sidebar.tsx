"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActiveIdsFromPath } from "@/lib/tenancy/active-path";
import { useSidebar } from "./sidebar-context";
import type { Business, Product } from "@/lib/tenancy/types";

/**
 * Business -> Product drill-down (docs/prospects-pipeline-redesign-requirements.md R12),
 * now a standard collapsed-by-default drawer opened via the header's hamburger
 * (sidebar-toggle.tsx, shared open state from sidebar-context.tsx) rather than a
 * permanently visible column -- dismissible by backdrop click, Escape, or navigating to a
 * link inside it.
 */
export function Sidebar({
  businesses,
  productsByBusiness,
}: {
  businesses: Business[];
  productsByBusiness: Record<string, Product[]>;
}) {
  const { open, setOpen } = useSidebar();
  const pathname = usePathname();
  const { businessId: activeBusinessId, productId: activeProductId } =
    getActiveIdsFromPath(pathname);

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(activeBusinessId ? [activeBusinessId] : []),
  );

  function toggleBusiness(businessId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(businessId)) next.delete(businessId);
      else next.add(businessId);
      return next;
    });
  }

  // Escape closes the drawer, matching every other dismissible overlay in the app.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 top-14 z-30 bg-black/50"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <nav
        aria-label="Businesses"
        className="fixed top-14 bottom-0 left-0 z-40 flex w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r bg-background p-3 text-sm shadow-2xl"
      >
        <div className="flex items-center justify-between px-2 pb-2">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Businesses
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
            className="text-muted-foreground transition-colors hover:text-foreground active:scale-90"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <Link
          href="/dashboard"
          onClick={() => setOpen(false)}
          className={cn(
            "rounded-md px-2 py-1.5 font-medium hover:bg-accent",
            pathname === "/dashboard" && "bg-accent",
          )}
        >
          All businesses
        </Link>

        {businesses.map((business) => {
          const products = productsByBusiness[business.id] ?? [];
          const isExpanded = expanded.has(business.id) || business.id === activeBusinessId;
          const isActiveBusiness = business.id === activeBusinessId && !activeProductId;

          return (
            <div key={business.id} className="flex flex-col">
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => toggleBusiness(business.id)}
                  disabled={products.length === 0}
                  aria-label={isExpanded ? `Collapse ${business.name}` : `Expand ${business.name}`}
                  className="flex size-6 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-0"
                >
                  {isExpanded ? "▾" : "▸"}
                </button>
                <Link
                  href={`/dashboard/businesses/${business.id}`}
                  onClick={() => {
                    // Expand immediately (don't wait on the route transition) and, unlike
                    // every other link in this drawer, don't close it -- the whole point
                    // of clicking a business is to see its products open up next, not to
                    // have the drawer vanish before that can happen.
                    setExpanded((prev) => new Set(prev).add(business.id));
                  }}
                  className={cn(
                    "flex-1 truncate rounded-md px-2 py-1.5 hover:bg-accent",
                    isActiveBusiness && "bg-accent font-medium",
                  )}
                >
                  {business.name}
                </Link>
              </div>

              {isExpanded && products.length > 0 ? (
                <div className="ml-6 flex flex-col gap-0.5 border-l pl-2">
                  {products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/dashboard/businesses/${business.id}/products/${product.id}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "truncate rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground",
                        product.id === activeProductId && "bg-accent font-medium text-foreground",
                      )}
                    >
                      {product.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </>
  );
}
