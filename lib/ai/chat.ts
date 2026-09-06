import { generateText, type ModelMessage } from "ai";
import { getCurrentAccount, getFirstWorkspaceForAccount } from "@/lib/tenancy/queries";
import { assertWithinUsageLimit } from "@/lib/usage/limits";
import { chatSystemPrompt, CHAT_PROMPT_VERSION } from "@/prompts/chat/chat_v1";
import { hashInput } from "./hash";
import { recordAiRun } from "./usage";
import { AiProviderError, resolveAiModel, toAiProviderError } from "./router";

const OPERATION = "chat";
/** Caps how much prior turn history rides along on every request -- keeps the prompt
 * short (CLAUDE.md principle 9) rather than re-sending an ever-growing thread. */
const MAX_HISTORY_MESSAGES = 20;

export type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Header AI assistant (docs item: navbar chat icon) -- account-wide, not tied to one
 * workspace. Credential lookup is inherently account-scoped (lib/ai/router.ts), so any
 * workspace under the account resolves the same provider key; the first one found is
 * used purely to attribute the ai_runs cost-ledger entry and usage-limit check. History
 * is ephemeral: nothing is persisted, the caller holds the transcript in memory.
 */
export async function sendChatMessage(messages: ChatMessage[]): Promise<string> {
  const account = await getCurrentAccount();
  if (!account) {
    throw new AiProviderError("no_provider_connected", "Sign in to use the assistant.");
  }

  const workspace = await getFirstWorkspaceForAccount(account.id);
  if (!workspace) {
    throw new AiProviderError(
      "no_provider_connected",
      "Create a business and product before using the assistant.",
    );
  }

  await assertWithinUsageLimit(workspace.id);

  const trimmed = messages.slice(-MAX_HISTORY_MESSAGES);
  const { accountId, provider, modelId, model } = await resolveAiModel(workspace.id, OPERATION);
  const inputHash = hashInput({ messages: trimmed, version: CHAT_PROMPT_VERSION, model: modelId });

  const startedAt = Date.now();
  try {
    const response = await generateText({
      model,
      system: chatSystemPrompt(),
      messages: trimmed as ModelMessage[],
    });

    await recordAiRun({
      workspaceId: workspace.id,
      operation: OPERATION,
      model: modelId,
      promptVersion: CHAT_PROMPT_VERSION,
      inputHash,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      status: "succeeded",
      accountId,
      provider,
      durationMs: Date.now() - startedAt,
    });

    return response.text;
  } catch (error) {
    const aiError = toAiProviderError(error, provider);
    await recordAiRun({
      workspaceId: workspace.id,
      operation: OPERATION,
      model: modelId,
      promptVersion: CHAT_PROMPT_VERSION,
      inputHash,
      status: "failed",
      accountId,
      provider,
      durationMs: Date.now() - startedAt,
      errorCode: aiError.code,
    });
    throw aiError;
  }
}
