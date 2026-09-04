import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@/lib/supabase/server";
import { getProspect } from "@/lib/prospects/queries";
import { getWorkspace, getProduct } from "@/lib/tenancy/queries";
import { getIcpProfile } from "@/lib/icp/queries";
import { getProspectResearch } from "@/lib/research/queries";
import { getProspectScore } from "@/lib/scoring/queries";
import type { Contact } from "@/lib/contacts/types";
import type { OutreachStrategy } from "@/lib/outreach/types";
import {
  generateStrategyPrompt,
  GENERATE_STRATEGY_PROMPT_VERSION,
} from "@/prompts/outreach/generate_strategy_v1";
import { anthropic, AI_MODELS } from "./client";
import { hashInput } from "./hash";
import { OutreachStrategySchema } from "./schemas";
import { recordAiRun } from "./usage";
import { assertWithinUsageLimit } from "@/lib/usage/limits";

const OPERATION = "generate_outreach_strategy";

/**
 * Requires the pipeline blueprint §18 assumes: approved product profile -> approved ICP
 * -> prospect research. Uses AI_MODELS.reasoning (not balanced/fast) because strategy
 * synthesis -- tying research evidence to a specific angle and CTA -- is exactly the case
 * blueprint §11 calls out for the strongest model, unlike extraction/classification.
 */
export async function generateOutreachStrategy(
  prospectId: string,
  contactId: string | null,
): Promise<OutreachStrategy> {
  const prospect = await getProspect(prospectId);
  if (!prospect) throw new Error("Prospect not found.");

  const workspace = await getWorkspace(prospect.workspace_id);
  if (!workspace) throw new Error("Workspace not found.");

  const product = await getProduct(workspace.product_id);
  if (!product) throw new Error("Product not found.");
  if (!product.product_profile) {
    throw new Error("Generate a product profile before creating an outreach strategy.");
  }

  const icp = await getIcpProfile(workspace.id);
  if (!icp || icp.status !== "approved") {
    throw new Error("Approve an ICP before creating an outreach strategy.");
  }

  const research = await getProspectResearch(prospectId);
  if (!research) {
    throw new Error("Research this prospect before creating an outreach strategy.");
  }

  const score = await getProspectScore(prospectId);

  await assertWithinUsageLimit(workspace.id);

  const supabase = await createClient();
  let contact: Contact | null = null;
  if (contactId) {
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", contactId)
      .maybeSingle();
    contact = data;
  }

  const prompt = generateStrategyPrompt({
    productName: product.name,
    productProfile: product.product_profile,
    icp,
    prospect,
    research,
    score,
    contact,
  });
  const inputHash = hashInput({ prompt, version: GENERATE_STRATEGY_PROMPT_VERSION });
  const model = AI_MODELS.reasoning;

  try {
    const response = await anthropic.messages.parse({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(OutreachStrategySchema) },
    });
    if (!response.parsed_output) {
      throw new Error("Model did not return a valid strategy.");
    }
    const draft = response.parsed_output;

    await recordAiRun({
      workspaceId: workspace.id,
      operation: OPERATION,
      model,
      promptVersion: GENERATE_STRATEGY_PROMPT_VERSION,
      inputHash,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      status: "succeeded",
    });

    const { data, error } = await supabase
      .from("outreach_strategies")
      .insert({
        workspace_id: workspace.id,
        prospect_id: prospect.id,
        contact_id: contactId,
        strategy: draft.strategy,
        channel: draft.channel,
        reason: draft.reason,
        key_message: draft.key_message,
        cta: draft.cta,
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
      promptVersion: GENERATE_STRATEGY_PROMPT_VERSION,
      inputHash,
      status: "failed",
    });
    throw error;
  }
}
