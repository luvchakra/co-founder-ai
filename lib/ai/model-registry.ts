// BYOK internal model registry (docs/byok-ai-requirements.md §4). The only place in the
// codebase that knows concrete provider model IDs -- every AI operation asks for a
// provider + quality tier and gets a model ID back, so a model upgrade is a one-line
// change here rather than a hunt through every lib/ai/*.ts file.
export type AiProvider = "openai" | "anthropic" | "google";
export type AiQualityTier = "fast" | "balanced" | "reasoning";

const MODEL_REGISTRY: Record<AiProvider, Record<AiQualityTier, string>> = {
  // Matches lib/ai/client.ts's existing AI_MODELS -- Anthropic was the sole provider
  // before BYOK, so its tiers were already chosen there.
  anthropic: {
    fast: "claude-haiku-4-5",
    balanced: "claude-sonnet-5",
    reasoning: "claude-opus-5",
  },
  // gpt-5.4 family: the newest generation with an explicit mini/base/pro spread across
  // both the Chat Completions and Responses APIs (Responses is required for provider-
  // executed web search -- see provider-factory.ts).
  openai: {
    fast: "gpt-5.4-mini",
    balanced: "gpt-5.4",
    reasoning: "gpt-5.4-pro",
  },
  // Google's "-latest" aliases track its current recommended model per tier without
  // needing a code change when Google ships a new generation.
  google: {
    fast: "gemini-flash-lite-latest",
    balanced: "gemini-flash-latest",
    reasoning: "gemini-pro-latest",
  },
};

export function resolveModelId(provider: AiProvider, tier: AiQualityTier): string {
  return MODEL_REGISTRY[provider][tier];
}
