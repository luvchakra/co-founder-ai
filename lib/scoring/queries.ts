import { createClient } from "@/lib/supabase/server";
import type { ProspectScore } from "./types";

export async function getProspectScore(prospectId: string): Promise<ProspectScore | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospect_scores")
    .select("*")
    .eq("prospect_id", prospectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
