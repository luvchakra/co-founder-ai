"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { useDismiss } from "@/hooks/use-dismiss";
import { SubmitButton } from "@/components/ui/submit-button";

function getInitials(name: string | null, email: string): string {
  const source = name?.trim();
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/**
 * Top-right avatar + account dropdown (CoFounderAI Header & Business Selector Enhancement
 * doc §1). "Profile" and "Help" are omitted -- neither a profile-management page nor a
 * help center exists in this app yet, and the doc itself makes Profile conditional ("if
 * profile management exists") and Help explicitly optional; shipping either as a link to
 * nowhere would just be the dead-CTA problem the earlier landing-page pass fixed.
 * Settings links to the one settings screen that exists today (AI Provider), replacing
 * the standalone header link that used to sit next to it.
 */
export function UserMenu({
  name,
  email,
  avatarUrl,
  signOutAction,
}: {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useDismiss(containerRef, open, () => setOpen(false));

  const initials = getInitials(name, email);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-semibold text-primary-foreground transition-[opacity,transform] duration-100 hover:opacity-90 active:scale-[0.94] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {avatarUrl ? (
          // avatar_url is an arbitrary external URL (Google's profile photo host), not a
          // local asset next/image's optimizer is configured for.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          initials
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-1 w-64 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{name ?? email}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>

          <div className="my-1 border-t" />

          <Link
            href="/dashboard/settings/ai-provider"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
          >
            <Settings className="size-4 text-muted-foreground" aria-hidden="true" />
            Settings
          </Link>

          <div className="my-1 border-t" />

          <form action={signOutAction}>
            <SubmitButton
              variant="ghost"
              pendingText="Signing out..."
              className="w-full justify-start gap-2 px-3 font-normal"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Log Out
            </SubmitButton>
          </form>
        </div>
      ) : null}
    </div>
  );
}
