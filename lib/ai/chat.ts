import { generateObject, type ModelMessage } from "ai";
import {
  getBusiness,
  getCurrentAccount,
  getFirstWorkspaceForAccount,
  getProduct,
  getWorkspaceForProduct,
  listBusinesses,
  listProducts,
  listWorkspacesForProducts,
} from "@/lib/tenancy/queries";
import type { Workspace } from "@/lib/tenancy/types";
import { getIcpProfile } from "@/lib/icp/queries";
import { getProspectCountsForWorkspaces, listProspects } from "@/lib/prospects/queries";
import { assertWithinUsageLimit } from "@/lib/usage/limits";
import { appendChatMessage, listChatMessages } from "@/lib/chat/queries";
import { chatSystemPrompt, CHAT_PROMPT_VERSION } from "@/prompts/chat/chat_v1";
import { hashInput } from "./hash";
import { recordAiRun } from "./usage";
import { AiProviderError, resolveAiModel, toAiProviderError } from "./router";
import { ChatResponseSchema } from "./schemas";

const OPERATION = "chat";
/** Caps how much prior turn history rides along on every request -- keeps the prompt
 * short (CLAUDE.md principle 9) rather than re-sending an ever-growing thread. */
const MAX_HISTORY_MESSAGES = 20;

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatReply = { answer: string; followUp: string | null };

/** businessId/productId parsed from the current page's URL (lib/tenancy/active-path.ts)
 * -- whatever the founder is looking at when they open the chat panel. */
export type ChatPageContext = { businessId: string | null; productId: string | null };

type ResolvedChatContext = {
  /** Workspace to attribute the ai_runs cost-ledger entry/usage-limit check to. Falls
   * back to the account's first workspace when the page context has none (e.g. the
   * founder is on /dashboard with no business/product selected). */
  workspace: Workspace | null;
  contextText: string;
  starterQuestions: string[];
};

function buildStarterQuestions(input: {
  productName: string;
  hasProfile: boolean;
  hasIcp: boolean;
  totalProspects: number;
  needsActionCount: number;
}): string[] {
  const { productName, hasProfile, hasIcp, totalProspects, needsActionCount } = input;
  const questions: string[] = [];

  if (!hasProfile) {
    questions.push(`How do I generate a product profile for ${productName}?`);
  } else if (!hasIcp) {
    questions.push(`How do I define an ICP for ${productName}?`);
  } else if (totalProspects === 0) {
    questions.push(`How do I find my first prospects for ${productName}?`);
  } else if (needsActionCount > 0) {
    questions.push(
      `What should I do next with the ${needsActionCount} prospect${needsActionCount === 1 ? "" : "s"} that need action?`,
    );
  }

  questions.push("How can I improve my outreach messaging?");
  questions.push("What's a good way to prioritize my prospects?");

  return questions.slice(0, 3);
}

/**
 * One-paragraph account overview -- every business, its products, and a total prospect
 * count -- so the assistant can answer questions that span beyond whatever page the
 * founder happens to be on (e.g. "which of my businesses needs attention?" asked from
 * /dashboard). Built from the same batched helpers the dashboard uses
 * (listWorkspacesForProducts, getProspectCountsForWorkspaces): one query per table for
 * the whole account rather than one per business/product, which is what keeps this cheap
 * enough to compute on every chat turn instead of needing a separate cache layer.
 * getCurrentAccount/listBusinesses/listProducts are already React cache()-wrapped, so
 * calling them again here costs nothing extra when the current-context branch below also
 * ends up calling them in the same request.
 */
async function buildAccountSummary(accountId: string): Promise<string> {
  const businesses = await listBusinesses(accountId);
  if (businesses.length === 0) {
    return "The founder has no businesses set up yet.";
  }

  const productLists = await Promise.all(businesses.map((b) => listProducts(b.id)));
  const allProducts = productLists.flat();
  const workspaces = await listWorkspacesForProducts(allProducts.map((p) => p.id));
  const countsByWorkspace = await getProspectCountsForWorkspaces(workspaces.map((w) => w.id));
  const totalProspects = Object.values(countsByWorkspace).reduce((sum, c) => sum + c.total, 0);

  const businessLines = businesses.slice(0, 10).map((business, i) => {
    const products = productLists[i];
    const productNames = products.length > 0 ? products.map((p) => p.name).join(", ") : "none yet";
    return `- "${business.name}": products: ${productNames}`;
  });

  return [
    `Account overview: ${businesses.length} business${businesses.length === 1 ? "" : "es"}, ` +
      `${allProducts.length} product${allProducts.length === 1 ? "" : "s"} total, ` +
      `${totalProspects} prospect${totalProspects === 1 ? "" : "s"} across the account.`,
    ...businessLines,
  ].join("\n");
}

/**
 * Turns the current page context into a short grounding summary plus a handful of
 * deterministic (no LLM call -- CLAUDE.md principle 4) starter questions reflecting
 * where the founder actually is in their pipeline. businessId/productId come from the
 * client, but every lookup runs through the RLS-scoped Supabase client (lib/tenancy
 * queries), so a business/product the account doesn't own resolves to null exactly like
 * everywhere else in the app -- no separate authorization check needed here.
 */
async function resolveChatContext(
  accountId: string,
  context: ChatPageContext,
): Promise<ResolvedChatContext> {
  const accountSummary = await buildAccountSummary(accountId);

  if (context.productId) {
    const product = await getProduct(context.productId);
    if (product) {
      const [business, workspace] = await Promise.all([
        getBusiness(product.business_id),
        getWorkspaceForProduct(product.id),
      ]);
      if (business && workspace) {
        const [icp, prospects] = await Promise.all([
          getIcpProfile(workspace.id),
          listProspects(workspace.id),
        ]);
        const hasProfile = Boolean(product.product_profile);
        const hasIcp = Boolean(icp);
        const totalProspects = prospects.length;
        const needsActionCount = prospects.filter((p) => p.nextAction !== null).length;
        const basePath = `/dashboard/businesses/${business.id}/products/${product.id}`;

        const contextText = [
          accountSummary,
          "",
          `Currently viewing:`,
          `Business: "${business.name}"`,
          `Product: "${product.name}"`,
          `Product profile: ${hasProfile ? "generated" : "not generated yet"}`,
          `ICP: ${hasIcp ? "defined" : "not defined yet"}`,
          `Prospects: ${totalProspects} total` +
            (totalProspects > 0 ? `, ${needsActionCount} need a next action` : ""),
          `Portal links you can use: overview ${basePath}, ICP ${basePath}/icp, ` +
            `prospects ${basePath}/prospects, conversions ${basePath}/conversions, ` +
            `usage ${basePath}/usage`,
        ].join("\n");

        return {
          workspace,
          contextText,
          starterQuestions: buildStarterQuestions({
            productName: product.name,
            hasProfile,
            hasIcp,
            totalProspects,
            needsActionCount,
          }),
        };
      }
    }
  }

  if (context.businessId) {
    const business = await getBusiness(context.businessId);
    if (business) {
      const products = await listProducts(business.id);
      const contextText = [
        accountSummary,
        "",
        "Currently viewing:",
        `Business: "${business.name}"`,
        products.length > 0
          ? `Products under this business: ${products.map((p) => p.name).join(", ")}`
          : "No products created yet for this business.",
        `Portal link you can use: /dashboard/businesses/${business.id}`,
      ].join("\n");

      return {
        workspace: null,
        contextText,
        starterQuestions:
          products.length === 0
            ? [
                `How do I create my first product for ${business.name}?`,
                "How does CoFounderAI work?",
              ]
            : [
                "Which of my products needs attention next?",
                "How can I improve my outreach messaging?",
              ],
      };
    }
  }

  return {
    workspace: null,
    contextText: [accountSummary, "", "No specific business or product is currently selected."].join(
      "\n",
    ),
    starterQuestions: [
      "How does CoFounderAI help me find customers?",
      "What should I set up first?",
    ],
  };
}

/** Starter questions shown when the chat panel opens with no history yet -- see
 * components/chat/ai-chat-widget.tsx. */
export async function getChatStarterQuestions(context: ChatPageContext): Promise<string[]> {
  const account = await getCurrentAccount();
  if (!account) return [];
  const resolved = await resolveChatContext(account.id, context);
  return resolved.starterQuestions;
}

/**
 * Resolves the same workspace sendChatMessage would attribute a new turn to, and returns
 * whatever's already persisted for it (supabase/migrations/20260906070000_chat_messages_schema.sql)
 * -- the widget loads this once per business/product it's opened against so a founder's
 * conversation survives a reload or reopening the panel later. `followUp` is only the
 * most recent assistant turn's, matching what the widget shows below the last message.
 */
export async function getChatHistory(
  context: ChatPageContext,
): Promise<{ messages: ChatMessage[]; followUp: string | null }> {
  const account = await getCurrentAccount();
  if (!account) return { messages: [], followUp: null };

  const resolved = await resolveChatContext(account.id, context);
  const workspace = resolved.workspace ?? (await getFirstWorkspaceForAccount(account.id));
  if (!workspace) return { messages: [], followUp: null };

  const history = await listChatMessages(workspace.id);
  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
  return {
    messages: history.map(({ role, content }) => ({ role, content })),
    followUp: lastAssistant?.followUp ?? null,
  };
}

/**
 * Header AI assistant (docs item: navbar chat icon) -- grounded in whatever
 * business/product the founder currently has in view. Credential lookup is inherently
 * account-scoped (lib/ai/router.ts); when the page context has no workspace (e.g. the
 * founder is on /dashboard), the account's first workspace is used purely to attribute
 * the ai_runs cost-ledger entry, usage-limit check, and now the persisted chat history
 * too, so all three stay consistent about which workspace "this conversation" belongs to.
 * `messages` is the full transcript the client is holding (including whatever
 * getChatHistory returned it originally) with exactly one new user turn appended --
 * only that new turn and the assistant's reply get written here, never the whole array,
 * or reloading history and sending a reply would double up every prior turn.
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  context: ChatPageContext,
): Promise<ChatReply> {
  const account = await getCurrentAccount();
  if (!account) {
    throw new AiProviderError("no_provider_connected", "Sign in to use the assistant.");
  }

  const resolved = await resolveChatContext(account.id, context);
  const workspace = resolved.workspace ?? (await getFirstWorkspaceForAccount(account.id));
  if (!workspace) {
    throw new AiProviderError(
      "no_provider_connected",
      "Create a business and product before using the assistant.",
    );
  }

  await assertWithinUsageLimit(workspace.id);

  const newUserMessage = messages[messages.length - 1];
  if (newUserMessage?.role === "user") {
    await appendChatMessage(workspace.id, newUserMessage);
  }

  const trimmed = messages.slice(-MAX_HISTORY_MESSAGES);
  const { accountId, provider, modelId, model } = await resolveAiModel(workspace.id, OPERATION);
  const inputHash = hashInput({
    messages: trimmed,
    contextText: resolved.contextText,
    version: CHAT_PROMPT_VERSION,
    model: modelId,
  });

  const startedAt = Date.now();
  try {
    const response = await generateObject({
      model,
      schema: ChatResponseSchema,
      system: chatSystemPrompt(resolved.contextText),
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

    const followUp = response.object.followUp || null;
    await appendChatMessage(workspace.id, {
      role: "assistant",
      content: response.object.answer,
      followUp,
    });

    return { answer: response.object.answer, followUp };
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
