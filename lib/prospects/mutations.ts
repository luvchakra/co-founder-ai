import { createClient } from "@/lib/supabase/server";
import { normalizeUrl } from "@/lib/url";
import type { Prospect, ProspectStatus } from "./types";

export type ProspectInput = {
  companyName: string;
  website?: string;
  industry?: string;
  companySize?: string;
  location?: string;
  description?: string;
};

export function extractDomain(url: string): string | null {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function toRow(input: ProspectInput) {
  const companyName = input.companyName.trim();
  if (!companyName) throw new Error("Company name is required.");

  return {
    company_name: companyName,
    website: input.website?.trim() || null,
    domain: input.website ? extractDomain(input.website) : null,
    industry: input.industry?.trim() || null,
    company_size: input.companySize?.trim() || null,
    location: input.location?.trim() || null,
    description: input.description?.trim() || null,
  };
}

export async function createProspect(
  workspaceId: string,
  input: ProspectInput,
): Promise<Prospect> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospects")
    .insert({ workspace_id: workspaceId, ...toRow(input) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProspect(
  prospectId: string,
  input: ProspectInput,
): Promise<Prospect> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospects")
    .update(toRow(input))
    .eq("id", prospectId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProspectStatus(
  prospectId: string,
  status: ProspectStatus,
): Promise<Prospect> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospects")
    .update({ status })
    .eq("id", prospectId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Bulk-inserts prospects from a CSV paste (Epic 5 Story 4). Each row must already be
 * validated/normalized by the caller -- this just inserts.
 */
export async function createProspectsBulk(
  workspaceId: string,
  inputs: ProspectInput[],
): Promise<number> {
  if (inputs.length === 0) return 0;
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("prospects")
    .insert(inputs.map((input) => ({ workspace_id: workspaceId, ...toRow(input) })), {
      count: "exact",
    });
  if (error) throw error;
  return count ?? inputs.length;
}

/** Moves selected suggestions into `prospects` (via the existing bulk-insert path)
 * and removes them from the staging table. Returns how many were added. */
export async function approveProspectSuggestions(
  workspaceId: string,
  suggestionIds: string[],
): Promise<number> {
  if (suggestionIds.length === 0) return 0;
  const supabase = await createClient();

  const { data: suggestions, error: fetchError } = await supabase
    .from("prospect_suggestions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("id", suggestionIds);
  if (fetchError) throw fetchError;
  if (!suggestions || suggestions.length === 0) return 0;

  const inserted = await createProspectsBulk(
    workspaceId,
    suggestions.map((s) => ({
      companyName: s.company_name,
      website: s.website ?? undefined,
      industry: s.industry ?? undefined,
      companySize: s.company_size ?? undefined,
      location: s.location ?? undefined,
      description: s.description ?? undefined,
    })),
  );

  const { error: deleteError } = await supabase
    .from("prospect_suggestions")
    .delete()
    .eq("workspace_id", workspaceId)
    .in("id", suggestionIds);
  if (deleteError) throw deleteError;

  return inserted;
}

export async function discardProspectSuggestions(
  workspaceId: string,
  suggestionIds: string[],
): Promise<void> {
  if (suggestionIds.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("prospect_suggestions")
    .delete()
    .eq("workspace_id", workspaceId)
    .in("id", suggestionIds);
  if (error) throw error;
}
