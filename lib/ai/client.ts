import Anthropic from "@anthropic-ai/sdk";

// Single AI provider (engineering-blueprint.md §3, §41: no multi-provider abstraction at
// MVP). All AI calls in the app must go through this module, never call the SDK directly
// from route handlers or components.
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

const PRICING_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-opus-5": { input: 5, output: 25 },
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
