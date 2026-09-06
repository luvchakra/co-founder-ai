import { cache } from "react";
import { listBusinesses, listProducts, listWorkspacesForProducts } from "@/lib/tenancy/queries";
import type { Business, Product, Workspace } from "@/lib/tenancy/types";
import {
  getProspectCountsForWorkspaces,
  listProspectsForWorkspaces,
} from "@/lib/prospects/queries";
import { getWorkspaceUsageForWorkspaces } from "@/lib/usage/queries";

export type AccountWorkspaceEntry = { workspace: Workspace; product: Product; business: Business };

/**
 * Every business/product/workspace on an account, resolved with a bounded number of
 * batched queries (one per table, not one per business or product) and memoized per
 * accountId for the lifetime of the request via React's cache(). app/(dashboard)/layout.tsx
 * (runs on every dashboard page) and the /dashboard page itself both need this full
 * account scan -- without memoizing by the one primitive argument they share (accountId),
 * each would run its own copy of the same set of queries back to back on every visit to
 * /dashboard specifically. cache() only dedupes by argument identity, and an array of ids
 * built fresh in each caller would never match another caller's array by reference, which
 * is why this takes accountId (a primitive, safe to key on) and does the array-building
 * internally rather than accepting a pre-built id list.
 */
export const getAccountWorkspaceEntries = cache(async (accountId: string) => {
  const businesses = await listBusinesses(accountId);
  const productLists = await Promise.all(businesses.map((b) => listProducts(b.id)));
  const productsByBusiness: Record<string, Product[]> = {};
  businesses.forEach((b, i) => {
    productsByBusiness[b.id] = productLists[i];
  });

  const allProducts = productLists.flat();
  const workspaces = await listWorkspacesForProducts(allProducts.map((p) => p.id));
  const workspaceByProductId = new Map(workspaces.map((w) => [w.product_id, w]));
  const businessById = new Map(businesses.map((b) => [b.id, b]));

  const entries: AccountWorkspaceEntry[] = [];
  for (const product of allProducts) {
    const workspace = workspaceByProductId.get(product.id);
    const business = businessById.get(product.business_id);
    if (workspace && business) entries.push({ workspace, product, business });
  }

  return { businesses, productsByBusiness, allProducts, entries };
});

/**
 * Usage + prospect status counts + the full pipeline-derived prospect list for every
 * workspace on an account, in three more batched queries -- memoized per accountId
 * alongside getAccountWorkspaceEntries above. Fetching the full prospect list once here
 * (rather than once per caller) means the dashboard's business/product slice-and-dice
 * filter and the header's alert derivation can both just filter this same in-memory list
 * by workspace id instead of issuing their own queries.
 */
export const getAccountUsageAndProspects = cache(async (accountId: string) => {
  const { entries } = await getAccountWorkspaceEntries(accountId);
  const workspaceIds = entries.map((e) => e.workspace.id);

  const [usageByWorkspace, countsByWorkspace, prospects] = await Promise.all([
    getWorkspaceUsageForWorkspaces(workspaceIds),
    getProspectCountsForWorkspaces(workspaceIds),
    listProspectsForWorkspaces(workspaceIds),
  ]);

  return { usageByWorkspace, countsByWorkspace, prospects };
});
