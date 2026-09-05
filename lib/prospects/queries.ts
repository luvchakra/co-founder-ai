import { createClient } from "@/lib/supabase/server";
import type { Prospect, ProspectStatus, ProspectSuggestion } from "./types";

export type ProspectFilters = {
  status?: ProspectStatus;
  industry?: string;
  search?: string;
};

export async function listProspects(
  workspaceId: string,
  filters: ProspectFilters = {},
): Promise<Prospect[]> {
  const supabase = await createClient();
  let query = supabase.from("prospects").select("*").eq("workspace_id", workspaceId);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.industry) query = query.eq("industry", filters.industry);
  if (filters.search) query = query.ilike("company_name", `%${filters.search}%`);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getProspect(prospectId: string): Promise<Prospect | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", prospectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Distinct industry values currently in use, for the filter dropdown. */
export async function listProspectIndustries(workspaceId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospects")
    .select("industry")
    .eq("workspace_id", workspaceId)
    .not("industry", "is", null);
  if (error) throw error;
  const values = new Set((data ?? []).map((row) => row.industry as string));
  return Array.from(values).sort();
}

export async function listProspectSuggestions(
  workspaceId: string,
): Promise<ProspectSuggestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospect_suggestions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
