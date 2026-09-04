import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@/lib/supabase/server";
import { getProspect } from "@/lib/prospects/queries";
import { getWorkspace, getProduct } from "@/lib/tenancy/queries";
import { getOutreachStrategy } from "@/lib/outreach/queries";
import type { Contact } from "@/lib/contacts/types";
import type { Message } from "@/lib/messages/types";
import {
  generateMessagePrompt,
  GENERATE_MESSAGE_PROMPT_VERSION,
} from "@/prompts/outreach/generate_message_v1";
import { anthropic, AI_MODELS } from "./client";
import { hashInput } from "./hash";
import { OutreachMessageSchema } from "./schemas";
import { recordAiRun } from "./usage";

const OPERATION = "generate_outreach_message";

/**
 * Only works from an *approved* strategy (blueprint §18: "Prospect -> Research -> Score
 * -> Strategy -> Founder Review -> Message"). Every message is created with status
 * "draft" -- generation never sends anything, matching blueprint §20's human-approval
 * gate on all outbound communication.
 */
export async function generateOutreachMessage(strategyId: string): Promise<Message> {
  const strategy = await getOutreachStrategy(strategyId);
  if (!strategy) throw new Error("Strategy not found.");
  if (strategy.status !== "approved") {
    throw new Error("Approve the strategy before generating a message.");
  }

  const prospect = await getProspect(strategy.prospect_id);
  if (!prospect) throw new Error("Prospect not found.");

  const workspace = await getWorkspace(prospect.workspace_id);
  if (!workspace) throw new Error("Workspace not found.");

  const product = await getProduct(workspace.product_id);
  if (!product?.product_profile) throw new Error("Product profile not found.");

  const supabase = await createClient();
  let contact: Contact | null = null;
  if (strategy.contact_id) {
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", strategy.contact_id)
      .maybeSingle();
    contact = data;
  }

  const prompt = generateMessagePrompt({
    productName: product.name,
    productProfile: product.product_profile,
    prospect,
    contact,
    strategy,
  });
  const inputHash = hashInput({ prompt, version: GENERATE_MESSAGE_PROMPT_VERSION });
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
      promptVersion: GENERATE_MESSAGE_PROMPT_VERSION,
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
        contact_id: strategy.contact_id,
        channel: strategy.channel,
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
      promptVersion: GENERATE_MESSAGE_PROMPT_VERSION,
      inputHash,
      status: "failed",
    });
    throw error;
  }
}
