"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NOTCH = 14;

/** Chevron-shaped tab: a point on the right (unless last) and a matching notch cut into
 * the left (unless first), so consecutive tabs interlock into one continuous arrow strip
 * -- the ServiceNow/wizard "stage tracker" look, not a plain underlined tab row. */
function clipPathFor(index: number, count: number): string {
  const isFirst = index === 0;
  const isLast = index === count - 1;
  const points = ["0 0", isLast ? "100% 0" : `calc(100% - ${NOTCH}px) 0`];
  if (!isLast) points.push("100% 50%");
  points.push(isLast ? "100% 100%" : `calc(100% - ${NOTCH}px) 100%`, "0 100%");
  if (!isFirst) points.push(`${NOTCH}px 50%`);
  return `polygon(${points.join(", ")})`;
}

export function ProductNav({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: basePath, label: "Overview" },
    { href: `${basePath}/icp`, label: "ICP" },
    { href: `${basePath}/prospects`, label: "Prospects" },
    { href: `${basePath}/usage`, label: "Usage" },
  ];

  const activeIndex = tabs.findIndex((tab) =>
    tab.href === basePath
      ? pathname === basePath
      : pathname === tab.href || pathname.startsWith(`${tab.href}/`),
  );

  return (
    <nav aria-label="Product sections" className="flex text-sm">
      {tabs.map((tab, i) => {
        const isActive = i === activeIndex;
        const isPast = activeIndex !== -1 && i < activeIndex;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            style={{ clipPath: clipPathFor(i, tabs.length), marginLeft: i === 0 ? 0 : -NOTCH }}
            className={cn(
              "flex h-9 shrink-0 items-center justify-center pr-5 pl-6 font-medium whitespace-nowrap transition-colors",
              i === 0 && "pl-5",
              isActive
                ? "bg-primary text-primary-foreground"
                : isPast
                  ? "bg-accent text-foreground hover:bg-accent/70"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
