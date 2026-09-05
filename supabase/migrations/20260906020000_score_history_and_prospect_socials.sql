-- Prospects Pipeline Redesign R8 + R13 (docs/prospects-pipeline-redesign-requirements.md).

-- R8: prospect_scores was upserted on prospect_id, destroying prior scores on every
-- rescore. Make it append-only: drop the unique constraint (and its implicit index),
-- add a plain index instead since lookups still filter by prospect_id.
alter table public.prospect_scores
  drop constraint prospect_scores_prospect_id_key;

create index prospect_scores_prospect_id_idx on public.prospect_scores (prospect_id);

-- R13: company-level socials, alongside the existing website/domain.
alter table public.prospects
  add column linkedin_url text,
  add column twitter_url text,
  add column company_email text;
