import { createClient } from "@/lib/supabase/server";
import type { KnowledgeSourceType, ProductKnowledge } from "./types";

const MAX_CONTENT_LENGTH = 15_000;

export async function addKnowledgeSource(
  workspaceId: string,
  input: { sourceType: KnowledgeSourceType; sourceName: string; content: string },
): Promise<ProductKnowledge> {
  const content = input.content.trim();
  if (!content) throw new Error("Content is required.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_knowledge")
    .insert({
      workspace_id: workspaceId,
      source_type: input.sourceType,
      source_name: input.sourceName.trim() || input.sourceType,
      content: content.slice(0, MAX_CONTENT_LENGTH),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteKnowledgeSource(sourceId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("product_knowledge").delete().eq("id", sourceId);
  if (error) throw error;
}

/**
 * Fetches a URL and extracts readable text with a lightweight regex-based strip -- no
 * HTML-parsing dependency for MVP. Runs at request time on the server (Vercel), not in
 * any sandboxed dev environment, since it needs real internet access.
 */
export async function addWebsiteKnowledgeSource(
  workspaceId: string,
  url: string,
): Promise<ProductKnowledge> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported.");
  }

  const response = await fetch(parsed.toString(), {
    headers: { "User-Agent": "co-founder-ai/0.1 (product research)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  const html = await response.text();
  const text = extractTextFromHtml(html);
  if (!text) {
    throw new Error("Could not extract any text from that URL.");
  }

  return addKnowledgeSource(workspaceId, {
    sourceType: "website",
    sourceName: url,
    content: text,
  });
}

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CONTENT_LENGTH);
}
