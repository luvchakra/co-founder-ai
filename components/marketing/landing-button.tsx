import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The one primary CTA style used everywhere on the landing page (design principle 4:
 * "one primary action" -- Start Free stays visually consistent, secondary actions never
 * compete with it). variant="secondary" is for things like "See How It Works" that must
 * still be visible without pulling attention away from the primary CTA.
 */
export function LandingButton({
  href,
  variant = "primary",
  size = "default",
  className,
  children,
  ...props
}: {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "default" | "lg";
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-accent focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg",
        size === "lg" ? "px-7 py-3.5 text-base" : "px-5 py-2.5 text-sm",
        variant === "primary" &&
          "bg-landing-accent text-landing-accent-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-landing-accent/90",
        variant === "secondary" &&
          "border border-landing-surface-border bg-landing-surface text-landing-fg hover:bg-white/10",
        variant === "ghost" && "text-landing-fg hover:text-landing-accent",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
