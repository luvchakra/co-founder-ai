import type { SupabaseClient } from "@supabase/supabase-js";
import { APICallError, type LanguageModel } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getAccountIdForWorkspace } from "@/lib/tenancy/queries";
import { decryptApiKey } from "@/lib/crypto/api-key";
import { resolveModelId, type AiProvider, type AiQualityTier } from "./model-registry";
import { getOperationSpec, type AiOperation } from "./operation-registry";
import { createLanguageModel } from "./provider-factory";

/**
 * The AI Router (docs/byok-ai-requirements.md §9): the one place that turns
 * "operation" + "workspace" into a concrete, provider-bound language model. Callers in
 * lib/ai/*.ts never choose a model or a provider -- see resolveAiModel below.
 */

export type AiErrorCode =
  | "no_provider_connected"
  | "invalid_key"
  | "rate_limited"
  | "model_unavailable"
  | "provider_unavailable"
  | "timeout"
  | "unknown";

/**
 * Every user-facing AI failure in BYOK mode normalizes to one of these codes (GTM-031)
 * so the UI can render "Your {provider} API key could not complete this request."
 * without parsing provider-specific error shapes, and ai_runs.error_code stays
 * queryable. There is deliberately no code path that falls back to a company-owned AI
 * account on any of these -- docs/byok-ai-requirements.md §6.
 */
export class AiProviderError extends Error {
  readonly code: AiErrorCode;
  readonly provider?: AiProvider;

  constructor(code: AiErrorCode, message: string, provider?: AiProvider) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
    this.provider = provider;
  }
}

export type ResolvedAiModel = {
  accountId: string;
  provider: AiProvider;
  modelId: string;
  model: LanguageModel;
  /**
   * Builds a model at a different quality tier using the same already-resolved
   * credential, without a second DB fetch/decrypt. For multi-step operations like
   * research_prospect and discover_prospects: the reasoning tier gathers findings via
   * web search, then the fast tier structures them -- one credential resolution serves
   * both steps.
   */
  modelAtTier: (tier: AiQualityTier, options?: { webSearch?: boolean }) => LanguageModel;
};

type ProviderCredentialRow = {
  provider: AiProvider;
  encrypted_api_key: string;
};

/**
 * Selects only the columns the router needs to build a request, and only from here --
 * per supabase/migrations/20260905041153_ai_provider_credentials_schema.sql, no
 * UI-facing query is meant to touch encrypted_api_key.
 *
 * Defaults to the RLS-scoped server client. Pass `client` (the admin client) for
 * operations with no logged-in user, e.g. classifyReply's usage from the inbound
 * email webhook.
 */
async function getProviderCredential(
  accountId: string,
  client?: SupabaseClient,
): Promise<ProviderCredentialRow | null> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("ai_provider_credentials")
    .select("provider, encrypted_api_key")
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Resolves the language model a workspace-scoped AI operation should use: looks up the
 * workspace's account, that account's connected provider credential, decrypts the key,
 * and asks the model registry for the right model at the operation's required quality
 * tier. Throws AiProviderError("no_provider_connected") if the account hasn't connected
 * a provider yet -- callers should catch this and point the founder at AI provider
 * settings rather than surfacing a generic failure.
 */
export async function resolveAiModel(
  workspaceId: string,
  operation: AiOperation,
  client?: SupabaseClient,
): Promise<ResolvedAiModel> {
  const accountId = await getAccountIdForWorkspace(workspaceId, client);
  if (!accountId) {
    throw new AiProviderError("no_provider_connected", "Workspace not found.");
  }

  const credential = await getProviderCredential(accountId, client);
  if (!credential) {
    throw new AiProviderError(
      "no_provider_connected",
      "Connect an AI provider before using this feature.",
    );
  }

  const apiKey = decryptApiKey(credential.encrypted_api_key);
  const spec = getOperationSpec(operation);
  const modelId = resolveModelId(credential.provider, spec.qualityTier);
  const model = createLanguageModel(credential.provider, apiKey, modelId, {
    webSearch: spec.requiresWebSearch,
  });

  const provider = credential.provider;
  const modelAtTier = (tier: AiQualityTier, options?: { webSearch?: boolean }) =>
    createLanguageModel(provider, apiKey, resolveModelId(provider, tier), options);

  return { accountId, provider, modelId, model, modelAtTier };
}

/**
 * Normalizes whatever a generateObject/generateText call threw into an AiProviderError
 * (GTM-031), so every lib/ai/*.ts operation surfaces the same "Your {provider} API key
 * could not complete this request" shape and ai_runs.error_code stays one of the fixed
 * AiErrorCode values regardless of which provider's SDK produced the failure.
 *
 * An AiProviderError thrown earlier (e.g. resolveAiModel's no_provider_connected) passes
 * through unchanged rather than getting re-wrapped as "unknown".
 */
export function toAiProviderError(error: unknown, provider: AiProvider): AiProviderError {
  if (error instanceof AiProviderError) return error;

  if (APICallError.isInstance(error)) {
    const status = error.statusCode;
    if (status === 401 || status === 403) {
      return new AiProviderError(
        "invalid_key",
        `Your ${provider} API key could not complete this request.`,
        provider,
      );
    }
    if (status === 429) {
      return new AiProviderError(
        "rate_limited",
        `Your ${provider} account hit a rate limit. Try again shortly.`,
        provider,
      );
    }
    if (status === 404) {
      return new AiProviderError(
        "model_unavailable",
        `The model this feature needs isn't available on your ${provider} account.`,
        provider,
      );
    }
    if (status !== undefined && status >= 500) {
      return new AiProviderError(
        "provider_unavailable",
        `${provider} is currently unavailable. Try again shortly.`,
        provider,
      );
    }
  }

  if (error instanceof Error && error.name === "TimeoutError") {
    return new AiProviderError(
      "timeout",
      `The request to ${provider} timed out.`,
      provider,
    );
  }

  return new AiProviderError(
    "unknown",
    `Your ${provider} API key could not complete this request.`,
    provider,
  );
}
