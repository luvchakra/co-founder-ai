/** Canonical site URL for SEO metadata (Open Graph, canonical links, sitemap). Set
 * NEXT_PUBLIC_SITE_URL in production once a custom domain exists; falls back to the
 * current Vercel deployment URL so metadata is still correct without it. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://co-founder-ai-ecru.vercel.app";
