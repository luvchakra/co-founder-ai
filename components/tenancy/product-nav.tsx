"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const NOTCH = 14;

type StageId = "overview" | "icp" | "prospects" | "usage";

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

export function ProductNav({
  basePath,
  completed,
}: {
  basePath: string;
  /** Real workflow progress (profile generated, ICP exists, prospects added) -- shown as
   * a checkmark on any non-current stage that's already been reached, distinct from
   * "isActive" (which tab you're currently viewing). Usage has no completion concept, so
   * it's omitted here and stays neutral unless it's the current tab. */
  completed?: Partial<Record<StageId, boolean>>;
}) {
  const pathname = usePathname();
  const tabs: { id: StageId; href: string; label: string }[] = [
    { id: "overview", href: basePath, label: "Overview" },
    { id: "icp", href: `${basePath}/icp`, label: "ICP" },
    { id: "prospects", href: `${basePath}/prospects`, label: "Prospects" },
    { id: "usage", href: `${basePath}/usage`, label: "Usage" },
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
        const isCompleted = !isActive && Boolean(completed?.[tab.id]);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            style={{ clipPath: clipPathFor(i, tabs.length), marginLeft: i === 0 ? 0 : -NOTCH }}
            className={cn(
              "flex h-9 shrink-0 items-center justify-center gap-1.5 pr-5 pl-6 font-medium whitespace-nowrap transition-colors",
              i === 0 && "pl-5",
              isActive
                ? "bg-primary text-primary-foreground"
                : isCompleted
                  ? "bg-accent text-foreground hover:bg-accent/70"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {isCompleted ? <Check className="size-3.5" aria-hidden="true" /> : null}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
