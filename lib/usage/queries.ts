import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceUsage } from "./types";

function currentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Aggregates the current calendar month's usage straight from ai_runs (blueprint §9's
 * append-only ledger) rather than a separate rollup table -- the ledger is small enough
 * per workspace at MVP scale to aggregate on read.
 *
 * Defaults to the RLS-scoped server client. Pass `client` (the admin client) for callers
 * with no logged-in user, e.g. classifyReply's usage check, which runs from the inbound
 * webhook.
 */
export async function getWorkspaceUsage(
  workspaceId: string,
  client?: SupabaseClient,
): Promise<WorkspaceUsage> {
  const supabase = client ?? (await createClient());
  const { start, end } = currentMonthRange();

  const { data, error } = await supabase
    .from("ai_runs")
    .select("operation, estimated_cost")
    .eq("workspace_id", workspaceId)
    .eq("status", "succeeded")
    .gte("created_at", start)
    .lt("created_at", end);
  if (error) throw error;

  const byOperationMap = new Map<string, { runs: number; cost: number }>();
  for (const row of data) {
    const entry = byOperationMap.get(row.operation) ?? { runs: 0, cost: 0 };
    entry.runs += 1;
    entry.cost += row.estimated_cost ?? 0;
    byOperationMap.set(row.operation, entry);
  }

  const byOperation = Array.from(byOperationMap.entries())
    .map(([operation, v]) => ({ operation, runs: v.runs, cost: v.cost }))
    .sort((a, b) => b.cost - a.cost);

  return {
    workspaceId,
    periodStart: start,
    periodEnd: end,
    totalRuns: data.length,
    totalCost: byOperation.reduce((sum, o) => sum + o.cost, 0),
    byOperation,
  };
}
