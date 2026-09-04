import { createClient } from "@/lib/supabase/server";
import type { IcpProfile } from "./types";

export async function getIcpProfile(workspaceId: string): Promise<IcpProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("icp_profiles")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
