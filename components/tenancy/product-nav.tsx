"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ProductNav({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: basePath, label: "Overview" },
    { href: `${basePath}/icp`, label: "ICP" },
  ];

  return (
    <nav className="flex gap-4 border-b text-sm">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 border-transparent pb-2 hover:border-foreground",
              active && "border-foreground font-medium",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
