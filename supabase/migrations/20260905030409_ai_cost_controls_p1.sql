-- AI cost requirements R3 + R6 (docs/ai-usage-cost-requirements.md).
--
-- R3: log the actual number of web searches a call used (available on the response as
-- usage.server_tool_use.web_search_requests) so future max_uses tuning has real data
-- instead of guesses. Null for non-web-search operations.
alter table public.ai_runs add column search_count integer;

-- R6: discoverProspects has no persisted "input" to hash against (the ICP + known
-- -companies list it searches from shifts as prospects are added), so R1's input-hash
-- dedup doesn't apply to it -- it needs an explicit in-flight lock instead, so two
-- overlapping discovery runs for the same workspace can't both bill. One row per
-- workspace; acquiring means inserting, releasing means deleting. A lock older than the
-- staleness window (lib/ai/discovery-lock.ts) is treated as abandoned (e.g. a crashed
-- request that never released it) and can be taken over.
create table public.prospect_discovery_locks (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  started_at timestamptz not null default now()
);

alter table public.prospect_discovery_locks enable row level security;

create policy "members can view discovery locks in their workspaces"
  on public.prospect_discovery_locks for select
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can create discovery locks in their workspaces"
  on public.prospect_discovery_locks for insert
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "members can update discovery locks in their workspaces"
  on public.prospect_discovery_locks for update
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can delete discovery locks in their workspaces"
  on public.prospect_discovery_locks for delete
  using (workspace_id in (select public.user_workspace_ids()));
