import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@/lib/supabase/server";
import { getProduct, getWorkspaceForProduct } from "@/lib/tenancy/queries";
import { getIcpProfile } from "@/lib/icp/queries";
import type { IcpProfile } from "@/lib/icp/types";
import {
  generateIcpPrompt,
  GENERATE_ICP_PROMPT_VERSION,
} from "@/prompts/icp/generate_icp_v1";
import { anthropic, AI_MODELS } from "./client";
import { hashInput } from "./hash";
import { IcpProfileSchema, type IcpProfileDraft } from "./schemas";
import { recordAiRun } from "./usage";
import { assertWithinUsageLimit } from "@/lib/usage/limits";

const OPERATION = "generate_icp";

/**
 * Generates (or regenerates) an ICP draft from the product's approved profile.
 * Regenerating always overwrites the existing row and resets it to "draft" -- an
 * approved ICP is only skipped when the caller does NOT explicitly force it, so this
 * never silently clobbers founder-approved data (blueprint §13).
 */
export async function generateIcp(
  productId: string,
  options: { force?: boolean } = {},
): Promise<IcpProfile> {
  const product = await getProduct(productId);
  if (!product) throw new Error("Product not found.");
  if (!product.product_profile) {
    throw new Error("Generate a product profile before defining an ICP.");
  }

  const workspace = await getWorkspaceForProduct(productId);
  if (!workspace) throw new Error("Workspace not found for product.");

  const existing = await getIcpProfile(workspace.id);
  if (existing && existing.status === "approved" && !options.force) {
    return existing;
  }

  await assertWithinUsageLimit(workspace.id);

  const prompt = generateIcpPrompt({
    productName: product.name,
    profile: product.product_profile,
  });
  const inputHash = hashInput({ prompt, version: GENERATE_ICP_PROMPT_VERSION });
  const model = AI_MODELS.balanced;

  let draft: IcpProfileDraft;
  try {
    const response = await anthropic.messages.parse({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(IcpProfileSchema) },
    });

    if (!response.parsed_output) {
      throw new Error("Model did not return a valid ICP.");
    }
    draft = response.parsed_output;

    await recordAiRun({
      workspaceId: workspace.id,
      operation: OPERATION,
      model,
      promptVersion: GENERATE_ICP_PROMPT_VERSION,
      inputHash,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      status: "succeeded",
    });
  } catch (error) {
    await recordAiRun({
      workspaceId: workspace.id,
      operation: OPERATION,
      model,
      promptVersion: GENERATE_ICP_PROMPT_VERSION,
      inputHash,
      status: "failed",
    });
    throw error;
  }

  const supabase = await createClient();
  const { data, error: upsertError } = await supabase
    .from("icp_profiles")
    .upsert(
      {
        workspace_id: workspace.id,
        name: draft.name,
        description: draft.description,
        industries: draft.industries,
        company_sizes: draft.company_sizes,
        geographies: draft.geographies,
        roles: draft.roles,
        pain_points: draft.pain_points,
        buying_signals: draft.buying_signals,
        exclusions: draft.exclusions,
        status: "draft",
      },
      { onConflict: "workspace_id" },
    )
    .select()
    .single();
  if (upsertError) throw upsertError;

  return data;
}
