"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

/**
 * Collapsed-by-default "+ Add X" trigger that expands in place to reveal `children` (a
 * form) -- same compact-by-default, expand-on-click pattern as EditableText, but for a
 * control that adds a new item rather than editing an existing field. Keeps a form that
 * isn't currently needed from permanently occupying page space.
 */
export function CollapsibleSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 self-start rounded-md border border-dashed px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{label}</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {children}
    </div>
  );
}
