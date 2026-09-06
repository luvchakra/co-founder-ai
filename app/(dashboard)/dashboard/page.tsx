import { redirect } from "next/navigation";
import {
  getCurrentAccount,
  getWorkspaceForProduct,
  listBusinesses,
  listProducts,
} from "@/lib/tenancy/queries";
import type { Product, Workspace } from "@/lib/tenancy/types";
import { getProspectCounts } from "@/lib/prospects/queries";
import { getWorkspaceUsage } from "@/lib/usage/queries";
import { creditsUsedPercent } from "@/lib/usage/format";
import { FREE_TIER_MONTHLY_COST_LIMIT_USD } from "@/lib/usage/limits";
import { BusinessList } from "@/components/tenancy/business-list";

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

export default async function DashboardPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");

  const businesses = await listBusinesses(account.id);
  const productLists = await Promise.all(
    businesses.map((business) => listProducts(business.id)),
  );
  const productsByBusiness: Record<string, Product[]> = {};
  businesses.forEach((business, i) => {
    productsByBusiness[business.id] = productLists[i];
  });

  const allProducts = productLists.flat();
  const workspaces = (
    await Promise.all(allProducts.map((product) => getWorkspaceForProduct(product.id)))
  ).filter((w): w is Workspace => w !== null);

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

      <section>
        <h2 className="text-xl font-semibold">Your businesses</h2>
        {businesses.length === 0 ? (
          <p className="mt-2 text-muted-foreground">
            Use the business selector in the header to create your first business and
            start building a GTM workspace for a product.
          </p>
        ) : (
          <div className="mt-4">
            <BusinessList businesses={businesses} productsByBusiness={productsByBusiness} />
          </div>
        )}
      </section>
    </main>
  );
}
