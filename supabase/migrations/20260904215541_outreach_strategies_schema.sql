-- Epic 7: GTM Strategy.
-- Unlike icp_profiles/prospect_research/prospect_scores, this is NOT one-row-per-prospect
-- -- a founder can generate a new strategy (e.g. targeting a different contact, or after
-- new research) without losing the previous one, so there's no unique constraint here.
-- The UI shows the most recent row per prospect.

create table public.outreach_strategies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  strategy text not null,
  channel text not null check (channel in ('email', 'linkedin', 'whatsapp')),
  reason text not null,
  key_message text not null,
  cta text not null,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index outreach_strategies_workspace_id_idx on public.outreach_strategies (workspace_id);
create index outreach_strategies_prospect_id_idx on public.outreach_strategies (prospect_id);

create trigger outreach_strategies_set_updated_at
  before update on public.outreach_strategies
  for each row execute function public.set_updated_at();

alter table public.outreach_strategies enable row level security;

create policy "members can view outreach strategies in their workspaces"
  on public.outreach_strategies for select
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can create outreach strategies in their workspaces"
  on public.outreach_strategies for insert
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "members can update outreach strategies in their workspaces"
  on public.outreach_strategies for update
  using (workspace_id in (select public.user_workspace_ids()));
