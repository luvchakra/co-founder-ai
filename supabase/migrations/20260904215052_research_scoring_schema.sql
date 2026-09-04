-- Epic 6: Research Engine.
-- One research record and one score record per prospect (unique prospect_id), replaced on
-- regenerate/rescoring rather than versioned/history-tracked -- same pattern as
-- icp_profiles. evidence is jsonb (variable-shape objects: claim/source_url/confidence),
-- unlike the plain string[] columns elsewhere.

create table public.prospect_research (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  prospect_id uuid not null unique references public.prospects (id) on delete cascade,
  summary text,
  pain_points text[] not null default '{}',
  buying_signals text[] not null default '{}',
  recent_events text[] not null default '{}',
  recommended_angle text,
  evidence jsonb not null default '[]'::jsonb,
  researched_at timestamptz not null default now(),
  expires_at timestamptz
);

create index prospect_research_workspace_id_idx on public.prospect_research (workspace_id);

alter table public.prospect_research enable row level security;

create policy "members can view prospect research in their workspaces"
  on public.prospect_research for select
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can create prospect research in their workspaces"
  on public.prospect_research for insert
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "members can update prospect research in their workspaces"
  on public.prospect_research for update
  using (workspace_id in (select public.user_workspace_ids()));

create table public.prospect_scores (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  prospect_id uuid not null unique references public.prospects (id) on delete cascade,
  icp_score integer not null check (icp_score between 0 and 100),
  intent_score integer not null check (intent_score between 0 and 100),
  timing_score integer not null check (timing_score between 0 and 100),
  overall_score integer not null check (overall_score between 0 and 100),
  reasoning text,
  created_at timestamptz not null default now()
);

create index prospect_scores_workspace_id_idx on public.prospect_scores (workspace_id);

alter table public.prospect_scores enable row level security;

create policy "members can view prospect scores in their workspaces"
  on public.prospect_scores for select
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can create prospect scores in their workspaces"
  on public.prospect_scores for insert
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "members can update prospect scores in their workspaces"
  on public.prospect_scores for update
  using (workspace_id in (select public.user_workspace_ids()));
