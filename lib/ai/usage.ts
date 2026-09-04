import { createClient } from "@/lib/supabase/server";
import { estimateCost } from "./client";

/**
 * ai_runs is an append-only usage/cost ledger (blueprint §9, §11) -- it does not store
 * results, only what an operation cost. Never let a logging failure break the caller's
 * actual result.
 */
export async function recordAiRun(input: {
  workspaceId: string;
  operation: string;
  model: string;
  promptVersion: string;
  inputHash: string;
  inputTokens?: number;
  outputTokens?: number;
  status: "succeeded" | "failed";
}) {
  const supabase = await createClient();
  const estimatedCost =
    input.inputTokens != null && input.outputTokens != null
      ? estimateCost(input.model, input.inputTokens, input.outputTokens)
      : null;

  const { error } = await supabase.from("ai_runs").insert({
    workspace_id: input.workspaceId,
    operation: input.operation,
    model: input.model,
    prompt_version: input.promptVersion,
    input_hash: input.inputHash,
    input_tokens: input.inputTokens ?? null,
    output_tokens: input.outputTokens ?? null,
    estimated_cost: estimatedCost,
    status: input.status,
  });

  if (error) {
    console.error("Failed to record ai_runs entry:", error.message);
  }
}
