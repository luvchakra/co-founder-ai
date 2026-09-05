import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace, getProduct } from "@/lib/tenancy/queries";
import { getIcpProfile } from "@/lib/icp/queries";
import { listProspects } from "@/lib/prospects/queries";
import type { ProspectSuggestion } from "@/lib/prospects/types";
import {
  discoverProspectsPrompt,
  structureDiscoveryPrompt,
  DISCOVER_PROSPECTS_PROMPT_VERSION,
} from "@/prompts/prospecting/discover_prospects_v1";
import { anthropic, AI_MODELS } from "./client";
import { hashInput } from "./hash";
import { DiscoveredProspectsSchema } from "./schemas";
import { recordAiRun } from "./usage";
import { assertWithinUsageLimit } from "@/lib/usage/limits";

const OPERATION = "discover_prospects";

/**
 * Finds up to 10 new prospect companies matching the workspace's approved ICP by
 * searching the live web -- same two-call pattern as researchProspect (Sonnet +
 * built-in web_search gathers findings, Haiku structures them). Results are stored as
 * *suggestions*, never inserted straight into `prospects`: a noisy search or a loose
 * ICP should never silently pollute the real pipeline. The founder reviews and
 * approves/discards each one in the UI.
 */
export async function discoverProspects(workspaceId: string): Promise<ProspectSuggestion[]> {
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) throw new Error("Workspace not found.");

  const product = await getProduct(workspace.product_id);
  if (!product) throw new Error("Product not found.");
  if (!product.product_profile) {
    throw new Error("Generate a product profile before discovering prospects.");
  }

  const icp = await getIcpProfile(workspaceId);
  if (!icp || icp.status !== "approved") {
    throw new Error("Approve an ICP before discovering prospects.");
  }

  await assertWithinUsageLimit(workspaceId);

  const existing = await listProspects(workspaceId, {});
  const knownCompanies = existing.map((p) => p.company_name);

  const prompt = discoverProspectsPrompt({
    productName: product.name,
    productProfile: product.product_profile,
    icp,
    knownCompanies,
  });
  const model = AI_MODELS.balanced;
  const inputHash = hashInput({ prompt, version: DISCOVER_PROSPECTS_PROMPT_VERSION });

  try {
    const searchResponse = await anthropic.messages.create({
      model,
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 10 }],
    });

    let findings = "";
    for (const block of searchResponse.content) {
      if (block.type === "text") findings += `${block.text}\n\n`;
    }
    findings = findings.trim();
    if (!findings) throw new Error("Prospect discovery returned no findings.");

    const structureResponse = await anthropic.messages.parse({
      model: AI_MODELS.fast,
      max_tokens: 4096,
      messages: [{ role: "user", content: structureDiscoveryPrompt(findings) }],
      output_config: { format: zodOutputFormat(DiscoveredProspectsSchema) },
    });
    if (!structureResponse.parsed_output) {
      throw new Error("Could not structure discovered prospects.");
    }

    const knownLower = new Set(knownCompanies.map((c) => c.toLowerCase()));
    const candidates = structureResponse.parsed_output.prospects
      .filter((c) => !knownLower.has(c.company_name.toLowerCase()))
      .slice(0, 10);

    await recordAiRun({
      workspaceId,
      operation: OPERATION,
      model,
      promptVersion: DISCOVER_PROSPECTS_PROMPT_VERSION,
      inputHash,
      inputTokens: searchResponse.usage.input_tokens + structureResponse.usage.input_tokens,
      outputTokens: searchResponse.usage.output_tokens + structureResponse.usage.output_tokens,
      status: "succeeded",
    });

    if (candidates.length === 0) return [];

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("prospect_suggestions")
      .insert(
        candidates.map((c) => ({
          workspace_id: workspaceId,
          company_name: c.company_name,
          website: c.website,
          industry: c.industry,
          company_size: c.company_size,
          location: c.location,
          description: c.description,
          match_reason: c.match_reason,
          source_url: c.source_url,
        })),
      )
      .select();
    if (error) throw error;
    return data;
  } catch (error) {
    await recordAiRun({
      workspaceId,
      operation: OPERATION,
      model,
      promptVersion: DISCOVER_PROSPECTS_PROMPT_VERSION,
      inputHash,
      status: "failed",
    });
    throw error;
  }
}
