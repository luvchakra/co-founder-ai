import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { OperationCostSample, WorkspaceUsage } from "./types";

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

/**
 * Rolling average cost for one operation, from its last `sampleSize` succeeded runs
 * (across all time, not just this month) -- backs the pre-action cost hints on
 * Discover/Research (ai-usage-cost-requirements R4). Null when there's no history yet,
 * so the UI never has to fall back to a hardcoded number.
 */
export async function getRecentOperationCost(
  workspaceId: string,
  operation: string,
  sampleSize = 10,
  client?: SupabaseClient,
): Promise<OperationCostSample | null> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("ai_runs")
    .select("estimated_cost")
    .eq("workspace_id", workspaceId)
    .eq("operation", operation)
    .eq("status", "succeeded")
    .not("estimated_cost", "is", null)
    .order("created_at", { ascending: false })
    .limit(sampleSize);
  if (error) throw error;
  if (!data || data.length === 0) return null;

  const costs = data.map((row) => row.estimated_cost as number);
  return {
    average: costs.reduce((sum, c) => sum + c, 0) / costs.length,
    min: Math.min(...costs),
    max: Math.max(...costs),
    sampleSize: costs.length,
  };
}
