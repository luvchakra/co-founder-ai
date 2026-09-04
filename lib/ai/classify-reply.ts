import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Message } from "@/lib/messages/types";
import {
  classifyReplyPrompt,
  CLASSIFY_REPLY_PROMPT_VERSION,
} from "@/prompts/outreach/classify_reply_v1";
import { anthropic, AI_MODELS } from "./client";
import { hashInput } from "./hash";
import { ReplyClassificationSchema } from "./schemas";
import { recordAiRun } from "./usage";

const OPERATION = "classify_reply";

/**
 * Classifies an inbound reply and stores the classification + a recommended next step
 * directly on the message row. Runs on the admin client -- its only caller is the
 * inbound-email webhook (lib/conversations/ingest-inbound-email.ts), which has no user
 * session for RLS to key off of. Uses the fast model tier (blueprint's "cheap model
 * first") since classification is a small, low-stakes task.
 */
export async function classifyReply(messageId: string): Promise<Message> {
  const admin = createAdminClient();

  const { data: message, error: messageError } = await admin
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .single();
  if (messageError) throw messageError;
  if (message.direction !== "inbound") {
    throw new Error("Only inbound messages can be classified.");
  }

  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .select("*")
    .eq("id", message.workspace_id)
    .single();
  if (workspaceError) throw workspaceError;

  const { data: product, error: productError } = await admin
    .from("products")
    .select("name")
    .eq("id", workspace.product_id)
    .single();
  if (productError) throw productError;

  const prompt = classifyReplyPrompt({ productName: product.name, replyContent: message.content });
  const inputHash = hashInput({ prompt, version: CLASSIFY_REPLY_PROMPT_VERSION });
  const model = AI_MODELS.fast;

  try {
    const response = await anthropic.messages.parse({
      model,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(ReplyClassificationSchema) },
    });
    if (!response.parsed_output) throw new Error("Model did not return a valid classification.");
    const draft = response.parsed_output;

    await recordAiRun({
      workspaceId: workspace.id,
      operation: OPERATION,
      model,
      promptVersion: CLASSIFY_REPLY_PROMPT_VERSION,
      inputHash,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      status: "succeeded",
      client: admin,
    });

    const { data, error } = await admin
      .from("messages")
      .update({
        classification: draft.classification,
        recommended_action: draft.recommended_action,
      })
      .eq("id", messageId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    await recordAiRun({
      workspaceId: workspace.id,
      operation: OPERATION,
      model,
      promptVersion: CLASSIFY_REPLY_PROMPT_VERSION,
      inputHash,
      status: "failed",
      client: admin,
    });
    throw error;
  }
}
