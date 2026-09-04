import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@/lib/supabase/server";
import { getProspect } from "@/lib/prospects/queries";
import { getWorkspace, getProduct } from "@/lib/tenancy/queries";
import { getIcpProfile } from "@/lib/icp/queries";
import type { ProspectResearch } from "@/lib/research/types";
import {
  researchProspectPrompt,
  structureResearchPrompt,
  RESEARCH_PROSPECT_PROMPT_VERSION,
} from "@/prompts/research/research_prospect_v1";
import { anthropic, AI_MODELS } from "./client";
import { hashInput } from "./hash";
import { ProspectResearchSchema } from "./schemas";
import { recordAiRun } from "./usage";

const OPERATION = "research_prospect";
const RESEARCH_TTL_DAYS = 30;

/**
 * Researches a prospect via two calls:
 * 1. Sonnet + the built-in Anthropic web_search tool gathers sourced findings. This is
 *    the app's "one research provider" (blueprint §3) -- no separate search API/key
 *    needed, since it rides on the same Anthropic credential lib/ai/ already requires.
 * 2. Haiku structures those findings into ProspectResearchSchema -- pure extraction from
 *    already-written text, exactly the "cheap model" case blueprint §11 calls out.
 *
 * The model is instructed not to invent facts; each evidence item carries a
 * fact/inference/assumption/unknown confidence tag (blueprint §33) rather than being
 * asserted flatly.
 */
export async function researchProspect(prospectId: string): Promise<ProspectResearch> {
  const prospect = await getProspect(prospectId);
  if (!prospect) throw new Error("Prospect not found.");

  const workspace = await getWorkspace(prospect.workspace_id);
  if (!workspace) throw new Error("Workspace not found.");

  const product = await getProduct(workspace.product_id);
  if (!product) throw new Error("Product not found.");

  const icp = await getIcpProfile(workspace.id);

  const researchPrompt = researchProspectPrompt({
    prospect,
    productName: product.name,
    productProfile: product.product_profile,
    icp,
  });
  const model = AI_MODELS.balanced;
  const inputHash = hashInput({ researchPrompt, version: RESEARCH_PROSPECT_PROMPT_VERSION });

  try {
    const searchResponse = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: researchPrompt }],
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
    });

    let findings = "";
    for (const block of searchResponse.content) {
      if (block.type === "text") findings += `${block.text}\n\n`;
    }
    findings = findings.trim();
    if (!findings) throw new Error("Web research returned no findings.");

    const structureResponse = await anthropic.messages.parse({
      model: AI_MODELS.fast,
      max_tokens: 2048,
      messages: [{ role: "user", content: structureResearchPrompt(findings) }],
      output_config: { format: zodOutputFormat(ProspectResearchSchema) },
    });
    if (!structureResponse.parsed_output) {
      throw new Error("Could not structure research findings.");
    }
    const draft = structureResponse.parsed_output;

    await recordAiRun({
      workspaceId: workspace.id,
      operation: OPERATION,
      model,
      promptVersion: RESEARCH_PROSPECT_PROMPT_VERSION,
      inputHash,
      inputTokens: searchResponse.usage.input_tokens + structureResponse.usage.input_tokens,
      outputTokens:
        searchResponse.usage.output_tokens + structureResponse.usage.output_tokens,
      status: "succeeded",
    });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("prospect_research")
      .upsert(
        {
          workspace_id: workspace.id,
          prospect_id: prospect.id,
          summary: draft.summary,
          pain_points: draft.pain_points,
          buying_signals: draft.buying_signals,
          recent_events: draft.recent_events,
          recommended_angle: draft.recommended_angle,
          evidence: draft.evidence,
          researched_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + RESEARCH_TTL_DAYS * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        { onConflict: "prospect_id" },
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    await recordAiRun({
      workspaceId: workspace.id,
      operation: OPERATION,
      model,
      promptVersion: RESEARCH_PROSPECT_PROMPT_VERSION,
      inputHash,
      status: "failed",
    });
    throw error;
  }
}
