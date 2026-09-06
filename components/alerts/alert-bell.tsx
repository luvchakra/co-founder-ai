"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useDismiss } from "@/hooks/use-dismiss";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Alert } from "@/lib/alerts/derive";

/** Bell icon before the chat icon in the header -- alerts are computed server-side
 * (app/(dashboard)/layout.tsx) from data already fetched for that render, so this
 * component is purely presentational: a dropdown over whatever list it's handed. */
export function AlertBell({ alerts }: { alerts: Alert[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useDismiss(containerRef, open, () => setOpen(false));

  const hasWarning = alerts.some((a) => a.severity === "warning");

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label={alerts.length > 0 ? `${alerts.length} alerts` : "Alerts"}
        aria-expanded={open}
        className="relative shrink-0 text-muted-foreground hover:text-foreground"
      >
        <Bell className="size-5" aria-hidden="true" />
        {alerts.length > 0 ? (
          <span
            className={cn(
              "absolute top-1 right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-medium text-primary-foreground",
              hasWarning ? "bg-destructive" : "bg-primary",
            )}
          >
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          role="menu"
          aria-label="Alerts"
          className="absolute top-full right-0 z-50 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {alerts.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            alerts.map((alert) => (
              <Link
                key={alert.id}
                href={alert.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-start gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    alert.severity === "warning" ? "bg-destructive" : "bg-primary",
                  )}
                  aria-hidden="true"
                />
                <span>{alert.message}</span>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
