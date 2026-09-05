import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@/lib/supabase/server";
import { getProduct, getWorkspaceForProduct } from "@/lib/tenancy/queries";
import { listProductKnowledge } from "@/lib/knowledge/queries";
import {
  understandProductPrompt,
  UNDERSTAND_PRODUCT_PROMPT_VERSION,
} from "@/prompts/product/understand_product_v1";
import { anthropic, AI_MODELS } from "./client";
import { hashInput } from "./hash";
import { ProductProfileSchema, type ProductProfile } from "./schemas";
import { recordAiRun } from "./usage";
import { assertWithinUsageLimit } from "@/lib/usage/limits";
import { hasRecentSuccess } from "./dedup";

const OPERATION = "understand_product";

/**
 * Synthesizes a structured ProductProfile from the workspace's product_knowledge sources.
 *
 * Caching: ai_runs has no result column (blueprint §9), so "cache" here means freshness --
 * if products.product_profile was generated after every current knowledge source's last
 * update, it's returned as-is instead of calling the AI again. Pass { force: true } to
 * regenerate regardless (e.g. a founder-triggered "Regenerate" button).
 */
export async function understandProduct(
  productId: string,
  options: { force?: boolean } = {},
): Promise<ProductProfile> {
  const product = await getProduct(productId);
  if (!product) throw new Error("Product not found.");

  const workspace = await getWorkspaceForProduct(productId);
  if (!workspace) throw new Error("Workspace not found for product.");

  const sources = await listProductKnowledge(workspace.id);
  if (sources.length === 0) {
    throw new Error("Add at least one knowledge source before generating a product profile.");
  }

  const latestSourceUpdate = sources.reduce(
    (latest, s) => (s.updated_at > latest ? s.updated_at : latest),
    sources[0].updated_at,
  );

  if (
    !options.force &&
    product.product_profile &&
    product.product_profile_generated_at &&
    product.product_profile_generated_at > latestSourceUpdate
  ) {
    return product.product_profile;
  }

  await assertWithinUsageLimit(workspace.id);

  const prompt = understandProductPrompt({
    productName: product.name,
    sources: sources.map((s) => ({
      sourceType: s.source_type,
      sourceName: s.source_name,
      content: s.content,
    })),
  });
  const inputHash = hashInput({ prompt, version: UNDERSTAND_PRODUCT_PROMPT_VERSION });
  const model = AI_MODELS.balanced;

  // Guards the force-regenerate path specifically -- the freshness check above already
  // covers everything else, but "Regenerate" intentionally bypasses it, so a double-click
  // there would otherwise re-bill for identical input every time.
  if (await hasRecentSuccess(workspace.id, OPERATION, inputHash)) {
    if (product.product_profile) return product.product_profile;
  }

  let profile: ProductProfile;
  try {
    const response = await anthropic.messages.parse({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(ProductProfileSchema) },
    });

    if (!response.parsed_output) {
      throw new Error("Model did not return a valid product profile.");
    }
    profile = response.parsed_output;

    await recordAiRun({
      workspaceId: workspace.id,
      operation: OPERATION,
      model,
      promptVersion: UNDERSTAND_PRODUCT_PROMPT_VERSION,
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
      promptVersion: UNDERSTAND_PRODUCT_PROMPT_VERSION,
      inputHash,
      status: "failed",
    });
    throw error;
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("products")
    .update({
      product_profile: profile,
      product_profile_generated_at: new Date().toISOString(),
    })
    .eq("id", productId);
  if (updateError) throw updateError;

  return profile;
}
