import Anthropic from "@anthropic-ai/sdk";

// engineering-blueprint.md §3's "single AI provider, no abstraction" decision is
// superseded by docs/byok-ai-requirements.md (BYOK) -- see lib/ai/router.ts for the
// current multi-provider entry point. This raw Anthropic client and AI_MODELS remain
// only until Story E rewires the last two web-search operations
// (research-prospect.ts, discover-prospects.ts) onto the router; every other
// lib/ai/*.ts operation already resolves its model through the router instead.
export const anthropic = new Anthropic();

/**
 * Model tiers per blueprint §11 "cheap model first" -- pick the cheapest tier that
 * reliably does the job; use `reasoning` only where synthesis/strategy quality actually
 * matters. Each lib/ai/ operation picks a tier explicitly rather than hard-coding one
 * model everywhere.
 */
export const AI_MODELS = {
  fast: "claude-haiku-4-5",
  balanced: "claude-sonnet-5",
  reasoning: "claude-opus-5",
} as const;

export type AiModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];

// Rough per-provider pricing for every model lib/ai/model-registry.ts can hand out, plus
// the legacy Anthropic-only entries above -- keyed by model ID so estimateCost works
// regardless of which provider actually served a BYOK-routed request.
const PRICING_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-opus-5": { input: 5, output: 25 },
  "gpt-5.4-mini": { input: 1, output: 5 },
  "gpt-5.4": { input: 2, output: 10 },
  "gpt-5.4-pro": { input: 5, output: 25 },
  "gemini-flash-lite-latest": { input: 1, output: 5 },
  "gemini-flash-latest": { input: 2, output: 10 },
  "gemini-pro-latest": { input: 5, output: 25 },
};

/** Rough cost estimate for ai_runs.estimated_cost -- not a billing-grade figure. */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = PRICING_PER_MILLION_TOKENS[model];
  if (!pricing) return 0;
  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}
