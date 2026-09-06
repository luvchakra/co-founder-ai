import { notFound } from "next/navigation";
import { getProduct, getWorkspaceForProduct } from "@/lib/tenancy/queries";
import { listProspects } from "@/lib/prospects/queries";
import { PROSPECT_STAGES, PROSPECT_STAGE_LABEL } from "@/lib/prospects/pipeline";

/**
 * A conversion funnel built entirely from data listProspects already returns -- no new
 * query, no new AI call. deriveProspectPipelineState (lib/prospects/pipeline.ts) checks
 * stages in reverse order and returns the first match, so a prospect's `.stage` is
 * always the furthest point it has reached; that makes "how many prospects reached
 * stage X or further" a plain index comparison against PROSPECT_STAGES.
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
  const total = prospects.length;
  const stageIndex = (stage: (typeof prospects)[number]["stage"]) =>
    PROSPECT_STAGES.indexOf(stage);

  const funnel = PROSPECT_STAGES.map((stage, i) => ({
    stage,
    label: PROSPECT_STAGE_LABEL[stage],
    reached: prospects.filter((p) => stageIndex(p.stage) >= i).length,
  }));

  const sentCount = funnel.find((f) => f.stage === "sent")?.reached ?? 0;
  const repliedCount = funnel.find((f) => f.stage === "replied")?.reached ?? 0;
  const closedCount = funnel.find((f) => f.stage === "closed")?.reached ?? 0;
  const replyRate = sentCount > 0 ? Math.round((repliedCount / sentCount) * 100) : 0;
  const closeRate = total > 0 ? Math.round((closedCount / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border p-4">
          <p className="text-xs text-muted-foreground">Total prospects</p>
          <p className="mt-1 text-2xl font-semibold">{total}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-xs text-muted-foreground">Reply rate</p>
          <p className="mt-1 text-2xl font-semibold">{replyRate}%</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-xs text-muted-foreground">Closed / won</p>
          <p className="mt-1 text-2xl font-semibold">{closedCount}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-xs text-muted-foreground">Overall conversion</p>
          <p className="mt-1 text-2xl font-semibold">{closeRate}%</p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border p-4">
        <h2 className="font-medium">Pipeline funnel</h2>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add prospects to see your conversion funnel.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {funnel.map((f, i) => {
              const percentOfTotal = total > 0 ? Math.round((f.reached / total) * 100) : 0;
              const prevReached = i > 0 ? funnel[i - 1].reached : total;
              const stepRate =
                prevReached > 0 ? Math.round((f.reached / prevReached) * 100) : 0;
              return (
                <div key={f.stage} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-muted-foreground">{f.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${percentOfTotal}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-medium">{f.reached}</span>
                  {i > 0 ? (
                    <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                      {stepRate}% of prev
                    </span>
                  ) : (
                    <span className="w-16 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
