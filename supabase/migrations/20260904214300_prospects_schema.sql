-- Epic 5: Prospect Management.
-- fit_score is populated by Epic 6 (Research Engine) scoring; nullable here since Epic 5
-- has no scoring logic yet. Status values are the minimal manual-triage set a founder
-- needs before automated research/signals exist -- expands in later epics, not now.

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  company_name text not null,
  website text,
  domain text,
  industry text,
  company_size text,
  location text,
  description text,
  status text not null default 'new' check (status in ('new', 'qualified', 'disqualified')),
  fit_score integer check (fit_score is null or (fit_score >= 0 and fit_score <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prospects_workspace_id_idx on public.prospects (workspace_id);

create trigger prospects_set_updated_at
  before update on public.prospects
  for each row execute function public.set_updated_at();

alter table public.prospects enable row level security;

create policy "members can view prospects in their workspaces"
  on public.prospects for select
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can create prospects in their workspaces"
  on public.prospects for insert
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "members can update prospects in their workspaces"
  on public.prospects for update
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can delete prospects in their workspaces"
  on public.prospects for delete
  using (workspace_id in (select public.user_workspace_ids()));

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  first_name text,
  last_name text,
  job_title text,
  email text,
  linkedin_url text,
  phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_workspace_id_idx on public.contacts (workspace_id);
create index contacts_prospect_id_idx on public.contacts (prospect_id);

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

alter table public.contacts enable row level security;

create policy "members can view contacts in their workspaces"
  on public.contacts for select
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can create contacts in their workspaces"
  on public.contacts for insert
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "members can update contacts in their workspaces"
  on public.contacts for update
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can delete contacts in their workspaces"
  on public.contacts for delete
  using (workspace_id in (select public.user_workspace_ids()));
