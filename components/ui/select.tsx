import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A native <select> styled to match Input exactly (border, height, focus ring, disabled
 * state) -- replaces the ad-hoc `border-input h-9 rounded-md border bg-transparent px-3
 * text-sm` className repeated at every call site, none of which had a focus ring. Stays a
 * real <select> (no custom listbox/combobox) rather than a new dependency; the browser's
 * own options popup is themed separately via `color-scheme: dark` in globals.css, since
 * that part can't be reached with CSS at all. `w-full` (matching Input) means its width
 * comes from the wrapping layout, not from its longest option -- without an explicit
 * width, some browsers size a <select> to fit its widest option, which is exactly how a
 * long filter label could force a page to overflow on a narrow screen.
 */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "border-input text-foreground flex h-9 w-full appearance-none items-center rounded-md border bg-transparent px-3 py-1 pr-8 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}

export { Select };
