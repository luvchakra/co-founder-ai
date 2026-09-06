import { notFound } from "next/navigation";
import { getProduct, getWorkspaceForProduct } from "@/lib/tenancy/queries";
import { listProspects } from "@/lib/prospects/queries";
import { computeConversionFunnel } from "@/lib/prospects/pipeline";
import { ConversionFunnelPanel } from "@/components/prospects/conversion-funnel-panel";

/**
 * A conversion funnel built entirely from data listProspects already returns -- no new
 * query, no new AI call. computeConversionFunnel (lib/prospects/pipeline.ts) exploits
 * deriveProspectPipelineState's reverse-order stage checks: a prospect's `.stage` is
 * always the furthest point it has reached, so "how many prospects reached stage X or
 * further" is a plain index comparison.
 */
export default async function ConversionsPage({
  params,
}: {
  params: Promise<{ businessId: string; productId: string }>;
}) {
  const { businessId, productId } = await params;
  const product = await getProduct(productId);
  if (!product || product.business_id !== businessId) notFound();

  const workspace = await getWorkspaceForProduct(product.id);
  if (!workspace) notFound();

  const prospects = await listProspects(workspace.id);
  const funnel = computeConversionFunnel(prospects);

  return <ConversionFunnelPanel funnel={funnel} />;
}
