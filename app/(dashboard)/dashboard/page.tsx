import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCurrentAccount,
  getWorkspaceForProduct,
  listBusinesses,
  listProducts,
} from "@/lib/tenancy/queries";
import type { Business, Product, Workspace } from "@/lib/tenancy/types";
import { getProspectCounts, listProspects } from "@/lib/prospects/queries";
import { computeConversionFunnel } from "@/lib/prospects/pipeline";
import { getWorkspaceUsage } from "@/lib/usage/queries";
import { creditsUsedPercent } from "@/lib/usage/format";
import { FREE_TIER_MONTHLY_COST_LIMIT_USD } from "@/lib/usage/limits";
import { ConversionFunnelPanel } from "@/components/prospects/conversion-funnel-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

function KpiCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-4">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-2xl font-semibold">{value}</span>
      {detail ? <span className="text-xs text-muted-foreground">{detail}</span> : null}
    </div>
  );
}

type WorkspaceEntry = { workspace: Workspace; product: Product; business: Business };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; product?: string }>;
}) {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");

  const { business: businessFilter, product: productFilter } = await searchParams;

  const businesses = await listBusinesses(account.id);
  const productLists = await Promise.all(
    businesses.map((business) => listProducts(business.id)),
  );
  const allProducts = productLists.flat();

  const businessById = new Map(businesses.map((b) => [b.id, b]));
  const workspaceEntries = (
    await Promise.all(
      allProducts.map(async (product): Promise<WorkspaceEntry | null> => {
        const workspace = await getWorkspaceForProduct(product.id);
        const business = businessById.get(product.business_id);
        if (!workspace || !business) return null;
        return { workspace, product, business };
      }),
    )
  ).filter((entry): entry is WorkspaceEntry => entry !== null);

  const workspaces = workspaceEntries.map((e) => e.workspace);

  const [prospectCountsByWorkspace, usageByWorkspace] = await Promise.all([
    Promise.all(workspaces.map((w) => getProspectCounts(w.id))),
    Promise.all(workspaces.map((w) => getWorkspaceUsage(w.id))),
  ]);

  const prospects = prospectCountsByWorkspace.reduce(
    (sum, c) => ({
      total: sum.total + c.total,
      new: sum.new + c.new,
      qualified: sum.qualified + c.qualified,
      disqualified: sum.disqualified + c.disqualified,
    }),
    { total: 0, new: 0, qualified: 0, disqualified: 0 },
  );
  const usage = usageByWorkspace.reduce(
    (sum, u) => ({ runs: sum.runs + u.totalRuns, cost: sum.cost + u.totalCost }),
    { runs: 0, cost: 0 },
  );

  // Slice-and-dice: a product filter is the most specific slice, then business, then
  // every workspace on the account. No new query shape -- just which workspaces'
  // already-computed prospect lists get merged into one funnel.
  const slicedEntries = productFilter
    ? workspaceEntries.filter((e) => e.product.id === productFilter)
    : businessFilter
      ? workspaceEntries.filter((e) => e.business.id === businessFilter)
      : workspaceEntries;
  const slicedProspectLists = await Promise.all(
    slicedEntries.map((e) => listProspects(e.workspace.id)),
  );
  const funnel = computeConversionFunnel(slicedProspectLists.flat());

  const productsForFilter = businessFilter
    ? workspaceEntries.filter((e) => e.business.id === businessFilter)
    : workspaceEntries;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 p-8">
      <section>
        <h1 className="text-xl font-semibold">Overview</h1>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Businesses" value={businesses.length} />
          <KpiCard label="Products" value={allProducts.length} />
          <KpiCard
            label="Prospects"
            value={prospects.total}
            detail={
              prospects.total > 0
                ? `${prospects.qualified} qualified · ${prospects.new} new`
                : undefined
            }
          />
          <KpiCard
            label="AI credits (month)"
            value={`${creditsUsedPercent(usage.cost, FREE_TIER_MONTHLY_COST_LIMIT_USD * Math.max(workspaces.length, 1))}%`}
            detail={`${usage.runs} run${usage.runs === 1 ? "" : "s"} used`}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Conversions</h2>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="business">Business</Label>
              <Select id="business" name="business" defaultValue={businessFilter ?? ""}>
                <option value="">All businesses</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="product">Product</Label>
              <Select id="product" name="product" defaultValue={productFilter ?? ""}>
                <option value="">All products</option>
                {productsForFilter.map((e) => (
                  <option key={e.product.id} value={e.product.id}>
                    {e.product.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" size="sm" variant="outline">
              Apply
            </Button>
            {businessFilter || productFilter ? (
              <Button asChild size="sm" variant="ghost">
                <Link href="/dashboard">Clear</Link>
              </Button>
            ) : null}
          </form>
        </div>

        {workspaceEntries.length === 0 ? (
          <p className="text-muted-foreground">
            Use the business selector in the header to create your first business and
            start building a GTM workspace for a product.
          </p>
        ) : (
          <ConversionFunnelPanel funnel={funnel} />
        )}
      </section>
    </main>
  );
}
