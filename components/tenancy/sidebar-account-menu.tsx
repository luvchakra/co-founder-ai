"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Settings,
  SunMoon,
  User,
} from "lucide-react";
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
 * Account switcher pinned to the very bottom of the sidebar drawer (moved here from the
 * header's top-right corner) -- the menu opens upward above its own trigger row since
 * there's no room below it. Same destinations as before (Profile/Usage/Settings/Log
 * out), just relocated.
 */
export function SidebarAccountMenu({
  name,
  email,
  avatarUrl,
  signOutAction,
  onNavigate,
}: {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  signOutAction: () => Promise<void>;
  /** Also closes the sidebar drawer itself when a menu item navigates. */
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useDismiss(containerRef, open, () => setOpen(false));

  const initials = getInitials(name, email);

  return (
    <div ref={containerRef} className="relative border-t">
      {open ? (
        <div
          role="menu"
          className="absolute inset-x-0 bottom-full mb-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{name ?? email}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>

          <div className="my-1 border-t" />

          <Link
            href="/dashboard/settings/profile"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate();
            }}
            className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
          >
            <User className="size-4 text-muted-foreground" aria-hidden="true" />
            Profile
          </Link>

          <Link
            href="/dashboard/settings/usage"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate();
            }}
            className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
          >
            <BarChart3 className="size-4 text-muted-foreground" aria-hidden="true" />
            Usage
          </Link>

          <Link
            href="/dashboard/settings/billing"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate();
            }}
            className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
          >
            <CreditCard className="size-4 text-muted-foreground" aria-hidden="true" />
            Billing
          </Link>

          <Link
            href="/dashboard/settings/appearance"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate();
            }}
            className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
          >
            <SunMoon className="size-4 text-muted-foreground" aria-hidden="true" />
            Appearance
          </Link>

          <Link
            href="/dashboard/settings/ai-provider"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate();
            }}
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

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent"
      >
        <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {avatarUrl ? (
            // avatar_url is an arbitrary external URL (Google's profile photo host, or
            // our own Storage URL), not a local asset next/image's optimizer is
            // configured for.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{name ?? email}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </div>
  );
}
