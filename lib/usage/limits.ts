import type { SupabaseClient } from "@supabase/supabase-js";
import { getWorkspaceUsage } from "./queries";

/**
 * MVP free tier (blueprint §22): no billing/Stripe yet, just a soft monthly cap on AI runs
 * per workspace so a single workspace can't run up unbounded API spend. Revisit once
 * paid plans exist.
 */
export const FREE_TIER_MONTHLY_RUN_LIMIT = 200;

export class UsageLimitExceededError extends Error {
  constructor(limit: number) {
    super(
      `This workspace has used its free-tier allowance of ${limit} AI runs this month. Try again next month.`,
    );
    this.name = "UsageLimitExceededError";
  }
}

/** Call before any AI-invoking operation so a workspace over its limit gets a clear error
 * instead of silently spending on a call that was never going to be allowed. */
export async function assertWithinUsageLimit(
  workspaceId: string,
  client?: SupabaseClient,
): Promise<void> {
  const usage = await getWorkspaceUsage(workspaceId, client);
  if (usage.totalRuns >= FREE_TIER_MONTHLY_RUN_LIMIT) {
    throw new UsageLimitExceededError(FREE_TIER_MONTHLY_RUN_LIMIT);
  }
}
