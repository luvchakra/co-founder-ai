-- Epic 4: ICP.
-- One ICP profile per workspace (unique workspace_id), edited/regenerated in place rather
-- than versioned -- the original blueprint's ICPVersion concept was explicitly dropped
-- for MVP (docs/blueprint.md §20 vs. docs/engineering-blueprint.md, which has no
-- versioning story in its Epic 4). Text[] columns since these are homogeneous string
-- lists, not variable-shape data -- a cleaner fit than jsonb here.

create table public.icp_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  name text not null default 'Ideal Customer Profile',
  description text,
  industries text[] not null default '{}',
  company_sizes text[] not null default '{}',
  geographies text[] not null default '{}',
  roles text[] not null default '{}',
  pain_points text[] not null default '{}',
  buying_signals text[] not null default '{}',
  exclusions text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger icp_profiles_set_updated_at
  before update on public.icp_profiles
  for each row execute function public.set_updated_at();

alter table public.icp_profiles enable row level security;

create policy "members can view icp profiles in their workspaces"
  on public.icp_profiles for select
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can create icp profiles in their workspaces"
  on public.icp_profiles for insert
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "members can update icp profiles in their workspaces"
  on public.icp_profiles for update
  using (workspace_id in (select public.user_workspace_ids()));
