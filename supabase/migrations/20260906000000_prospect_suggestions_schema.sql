-- Prospect discovery (AI web search for ICP-matching companies). Suggestions are
-- staged separately from `prospects` so a noisy or wrong search never lands directly
-- in the pipeline -- the founder must explicitly approve rows in the review UI, which
-- moves them into `prospects` via the existing bulk-insert path and deletes the
-- suggestion row. No update policy: a suggestion is either approved (-> deleted here,
-- inserted into prospects) or discarded (-> deleted here). Nothing else changes it.

create table public.prospect_suggestions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  company_name text not null,
  website text,
  industry text,
  company_size text,
  location text,
  description text,
  match_reason text,
  source_url text,
  created_at timestamptz not null default now()
);

create index prospect_suggestions_workspace_id_idx on public.prospect_suggestions (workspace_id);

alter table public.prospect_suggestions enable row level security;

create policy "members can view prospect suggestions in their workspaces"
  on public.prospect_suggestions for select
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can create prospect suggestions in their workspaces"
  on public.prospect_suggestions for insert
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "members can delete prospect suggestions in their workspaces"
  on public.prospect_suggestions for delete
  using (workspace_id in (select public.user_workspace_ids()));
