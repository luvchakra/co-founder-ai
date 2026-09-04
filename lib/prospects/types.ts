export type ProspectStatus = "new" | "qualified" | "disqualified";

export type Prospect = {
  id: string;
  workspace_id: string;
  company_name: string;
  website: string | null;
  domain: string | null;
  industry: string | null;
  company_size: string | null;
  location: string | null;
  description: string | null;
  status: ProspectStatus;
  fit_score: number | null;
  created_at: string;
  updated_at: string;
};
