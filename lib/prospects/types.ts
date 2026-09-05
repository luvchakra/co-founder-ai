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
  linkedin_url: string | null;
  twitter_url: string | null;
  company_email: string | null;
  created_at: string;
  updated_at: string;
};

export type ProspectSuggestion = {
  id: string;
  workspace_id: string;
  company_name: string;
  website: string | null;
  industry: string | null;
  company_size: string | null;
  location: string | null;
  description: string | null;
  match_reason: string | null;
  source_url: string | null;
  created_at: string;
};
