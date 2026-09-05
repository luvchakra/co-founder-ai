import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * How long an identical (operation, input_hash) success is considered fresh enough to
 * skip a re-run for. This guards against accidental duplicate billing -- a double-click,
 * a resubmitted form after a slow response, a retried request -- not a long-lived cache;
 * the operation-specific freshness checks that already exist (e.g. understandProduct's
 * product_profile_generated_at comparison) are the real caching layer and are keyed off
 * domain data, not this window.
 */
export const DEDUP_WINDOW_MS = 5 * 60 * 1000;

/**
 * True if a succeeded ai_runs row with this exact (workspace, operation, input_hash)
 * exists within the dedup window. Callers should skip the paid model call and re-read
 * their own persisted result instead -- the earlier call already wrote it.
 */
export async function hasRecentSuccess(
  workspaceId: string,
  operation: string,
  inputHash: string,
  client?: SupabaseClient,
): Promise<boolean> {
  const supabase = client ?? (await createClient());
  const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("ai_runs")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("operation", operation)
    .eq("input_hash", inputHash)
    .eq("status", "succeeded")
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}
