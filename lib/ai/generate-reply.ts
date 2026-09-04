import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@/lib/supabase/server";
import { getProspect } from "@/lib/prospects/queries";
import { getWorkspace, getProduct } from "@/lib/tenancy/queries";
import { getConversation } from "@/lib/conversations/queries";
import type { Contact } from "@/lib/contacts/types";
import type { Message } from "@/lib/messages/types";
import {
  generateReplyPrompt,
  GENERATE_REPLY_PROMPT_VERSION,
} from "@/prompts/outreach/generate_reply_v1";
import { anthropic, AI_MODELS } from "./client";
import { hashInput } from "./hash";
import { OutreachMessageSchema } from "./schemas";
import { recordAiRun } from "./usage";

const OPERATION = "generate_reply";

/**
 * Drafts a follow-up outbound message responding to the latest inbound reply in a
 * conversation. Requires that reply to already be classified (Epic 9 Story 3's
 * classifyReply(), run automatically on ingest) so the draft follows a concrete
 * recommended_action instead of guessing. Always created as status "draft" -- same
 * human-approval gate as generateOutreachMessage() (blueprint §20).
 */
export async function generateReply(conversationId: string): Promise<Message> {
  const conversation = await getConversation(conversationId);
  if (!conversation) throw new Error("Conversation not found.");

  const supabase = await createClient();
  const { data: latestInbound, error: inboundError } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (inboundError) throw inboundError;
  if (!latestInbound) throw new Error("No inbound reply to respond to yet.");
  if (!latestInbound.classification) {
    throw new Error("Classify the latest reply before generating a response.");
  }

  const prospect = await getProspect(conversation.prospect_id);
  if (!prospect) throw new Error("Prospect not found.");

  const workspace = await getWorkspace(conversation.workspace_id);
  if (!workspace) throw new Error("Workspace not found.");

  const product = await getProduct(workspace.product_id);
  if (!product?.product_profile) throw new Error("Product profile not found.");

  let contact: Contact | null = null;
  if (conversation.contact_id) {
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", conversation.contact_id)
      .maybeSingle();
    contact = data;
  }

  const prompt = generateReplyPrompt({
    productName: product.name,
    productProfile: product.product_profile,
    prospect,
    contact,
    channel: conversation.channel,
    replyContent: latestInbound.content,
    classification: latestInbound.classification,
    recommendedAction: latestInbound.recommended_action ?? "Respond appropriately.",
  });
  const inputHash = hashInput({ prompt, version: GENERATE_REPLY_PROMPT_VERSION });
  const model = AI_MODELS.balanced;

  try {
    const response = await anthropic.messages.parse({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(OutreachMessageSchema) },
    });
    if (!response.parsed_output) throw new Error("Model did not return a valid message.");
    const draft = response.parsed_output;

    await recordAiRun({
      workspaceId: workspace.id,
      operation: OPERATION,
      model,
      promptVersion: GENERATE_REPLY_PROMPT_VERSION,
      inputHash,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      status: "succeeded",
    });

    const content = draft.subject ? `Subject: ${draft.subject}\n\n${draft.body}` : draft.body;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        workspace_id: workspace.id,
        prospect_id: prospect.id,
        contact_id: conversation.contact_id,
        conversation_id: conversation.id,
        channel: conversation.channel,
        direction: "outbound",
        content,
        status: "draft",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    await recordAiRun({
      workspaceId: workspace.id,
      operation: OPERATION,
      model,
      promptVersion: GENERATE_REPLY_PROMPT_VERSION,
      inputHash,
      status: "failed",
    });
    throw error;
  }
}
