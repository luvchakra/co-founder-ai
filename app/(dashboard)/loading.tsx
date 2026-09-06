import Image from "next/image";

/**
 * Next.js loading UI convention: wraps every page below this layout segment in a
 * Suspense boundary, so this shows instantly on navigation while the destination page's
 * data is still fetching, without re-rendering the header/sidebar chrome in
 * app/(dashboard)/layout.tsx.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12">
      <div className="relative flex size-16 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <Image src="/logo-mark.png" alt="" width={442} height={350} priority className="h-8 w-auto" />
      </div>
      <span className="text-sm text-muted-foreground">Loading…</span>
    </div>
  );
}
