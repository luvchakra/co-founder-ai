"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Business, Product } from "@/lib/tenancy/types";

/**
 * Persistent Business -> Product drill-down (docs/prospects-pipeline-redesign-requirements.md
 * R12), replacing the two flat business-switcher/product-switcher <select> dropdowns --
 * this is the primary way a founder with multiple businesses/products reaches a given
 * prospect pipeline without going back to /dashboard first.
 */
export function Sidebar({
  businesses,
  productsByBusiness,
}: {
  businesses: Business[];
  productsByBusiness: Record<string, Product[]>;
}) {
  const pathname = usePathname();
  const activeBusinessId = pathname.match(/\/dashboard\/businesses\/([^/]+)/)?.[1] ?? null;
  const activeProductId = pathname.match(/\/products\/([^/]+)/)?.[1] ?? null;

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(activeBusinessId ? [activeBusinessId] : []),
  );

  function toggle(businessId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(businessId)) next.delete(businessId);
      else next.add(businessId);
      return next;
    });
  }

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r p-3 text-sm">
      <Link
        href="/dashboard"
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
                onClick={() => toggle(business.id)}
                disabled={products.length === 0}
                aria-label={isExpanded ? `Collapse ${business.name}` : `Expand ${business.name}`}
                className="flex size-6 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-0"
              >
                {isExpanded ? "▾" : "▸"}
              </button>
              <Link
                href={`/dashboard/businesses/${business.id}`}
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
  );
}
