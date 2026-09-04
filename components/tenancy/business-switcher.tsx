"use client";

import { useRouter } from "next/navigation";
import type { Business } from "@/lib/tenancy/types";

export function BusinessSwitcher({
  businesses,
  currentBusinessId,
}: {
  businesses: Business[];
  currentBusinessId: string;
}) {
  const router = useRouter();

  return (
    <select
      aria-label="Switch business"
      value={currentBusinessId}
      onChange={(event) =>
        router.push(`/dashboard/businesses/${event.target.value}`)
      }
      className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
    >
      {businesses.map((business) => (
        <option key={business.id} value={business.id}>
          {business.name}
        </option>
      ))}
    </select>
  );
}
