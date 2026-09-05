import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import type { AiProvider } from "./model-registry";

/**
 * Builds a Vercel AI SDK language model from a decrypted, per-account API key
 * (docs/byok-ai-requirements.md §9's "Provider Factory"). Never cached across requests
 * or accounts -- each call constructs a fresh provider client scoped to the one key it
 * was given, so one account's credential can never leak into another's request.
 *
 * OpenAI's provider-executed web search tool (Story E) only exists on the Responses
 * API, not Chat Completions -- `webSearch: true` routes through `.responses()` instead
 * of `.chat()` for that reason. Anthropic and Google don't have this split.
 */
export function createLanguageModel(
  provider: AiProvider,
  apiKey: string,
  modelId: string,
  options: { webSearch?: boolean } = {},
): LanguageModel {
  switch (provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey });
      return options.webSearch ? openai.responses(modelId) : openai.chat(modelId);
    }
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
    case "google":
      return createGoogle({ apiKey })(modelId);
  }
}
