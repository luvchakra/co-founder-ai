import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The mark's "tie" silhouette is a near-white fill (intentional on the dark theme's dark
 * background) that all but disappears on the light theme's white background --
 * logo-mark-light.png is the same file with that fill recolored to a dark violet-gray,
 * generated once (scripts aren't checked in; see the PR that added this) rather than
 * re-derived at runtime. Swapping via the `dark:` variant is pure CSS, so this works in
 * Server Components (header, loading spinner) with no client JS.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <>
      <Image
        src="/logo-mark-light.png"
        alt=""
        width={442}
        height={350}
        priority
        className={cn(className, "block dark:hidden")}
      />
      <Image
        src="/logo-mark.png"
        alt=""
        width={442}
        height={350}
        priority
        className={cn(className, "hidden dark:block")}
      />
    </>
  );
}
