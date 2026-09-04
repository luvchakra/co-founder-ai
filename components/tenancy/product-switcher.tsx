"use client";

import { useRouter } from "next/navigation";
import type { Product } from "@/lib/tenancy/types";

export function ProductSwitcher({
  businessId,
  products,
  currentProductId,
}: {
  businessId: string;
  products: Product[];
  currentProductId: string;
}) {
  const router = useRouter();

  return (
    <select
      aria-label="Switch product"
      value={currentProductId}
      onChange={(event) =>
        router.push(
          `/dashboard/businesses/${businessId}/products/${event.target.value}`,
        )
      }
      className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
    >
      {products.map((product) => (
        <option key={product.id} value={product.id}>
          {product.name}
        </option>
      ))}
    </select>
  );
}
