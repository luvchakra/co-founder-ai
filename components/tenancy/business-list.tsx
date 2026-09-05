"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Business, Product } from "@/lib/tenancy/types";

/**
 * "Your businesses" on /dashboard, as collapsible horizontal cards -- each business is
 * one full-width row (name + industry + chevron); clicking it expands in place to show
 * its description and products, rather than every business's contents being listed at
 * once. Only one expanded at a time (same accordion behavior as the header sidebar).
 */
export function BusinessList({
  businesses,
  productsByBusiness,
}: {
  businesses: Business[];
  productsByBusiness: Record<string, Product[]>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col divide-y rounded-md border">
      {businesses.map((business) => {
        const products = productsByBusiness[business.id] ?? [];
        const isExpanded = expandedId === business.id;

        return (
          <div key={business.id} className="flex flex-col">
            <button
              type="button"
              onClick={() => setExpandedId((prev) => (prev === business.id ? null : business.id))}
              aria-expanded={isExpanded}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="truncate font-medium">{business.name}</span>
                {business.industry ? (
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {business.industry}
                  </span>
                ) : null}
              </div>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-150",
                  isExpanded && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>

            {isExpanded ? (
              <div className="flex flex-col gap-3 border-t bg-muted/30 px-4 py-3">
                {business.description ? (
                  <p className="text-sm text-muted-foreground">{business.description}</p>
                ) : null}

                {products.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No products yet -- create one from the business page.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {products.map((product) => (
                      <li key={product.id}>
                        <Link
                          href={`/dashboard/businesses/${business.id}/products/${product.id}`}
                          className="block rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent"
                        >
                          {product.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  href={`/dashboard/businesses/${business.id}`}
                  className="self-start text-sm font-medium text-primary hover:underline"
                >
                  View business →
                </Link>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
