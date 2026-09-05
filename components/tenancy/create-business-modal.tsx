"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * "+ Create New Business" flow (CoFounderAI Header & Business Selector Enhancement doc
 * §3): a modal rather than a dedicated page, since it needs to be reachable from the
 * header on any dashboard screen, not just /dashboard where the inline create form
 * already lived. Submits to the same createBusinessAction the /dashboard page's own
 * create form uses (app/(dashboard)/dashboard/actions.ts) -- that action already creates
 * the business under the caller's own account (the only account a user has, so ownership
 * is inherent, not a separate assignment step), revalidates /dashboard, and redirects to
 * /dashboard/businesses/[id] -- which doubles as the "product setup experience" the doc
 * asks for, so a real form submission here just navigates there and the modal unmounts
 * with the rest of the page.
 */
export function CreateBusinessModal({
  action,
  onClose,
}: {
  action: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    inputRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8">
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${mounted ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-business-title"
        className={`relative w-full max-w-md rounded-2xl border bg-popover p-6 shadow-2xl transition-all duration-200 ${
          mounted ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <h2 id="create-business-title" className="text-lg font-semibold">
          Create a new business
        </h2>

        <form action={action} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-business-name">Business Name</Label>
            <Input ref={inputRef} id="create-business-name" name="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-business-description">Description (optional)</Label>
            <Textarea id="create-business-description" name="description" rows={3} />
          </div>
          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton pendingText="Creating...">Create Business</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
