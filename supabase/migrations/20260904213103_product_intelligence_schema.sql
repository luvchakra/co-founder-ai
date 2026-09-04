-- Epic 3: Product Intelligence.
-- product_knowledge holds raw ingested sources (manual description, website text, later
-- documents). The AI-derived structured synthesis is stored directly on products
-- (product_profile jsonb + product_profile_generated_at) rather than a separate table --
-- see docs/engineering-blueprint.md §9 ("use JSONB where flexibility is useful rather
-- than creating excessive normalized tables") and §12 (no profile-versioning table at
-- MVP; that's an original-blueprint idea explicitly superseded for MVP scope).
-- ai_runs is a usage/cost ledger (blueprint §9, §11) -- it does not store AI results;
-- the domain table (here, products.product_profile) is the result, and understandProduct()
-- treats a fresh product_profile as the cache instead of keying a generic result cache by
-- input_hash, since ai_runs intentionally has no result column per the blueprint's schema.

create table public.product_knowledge (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  source_type text not null check (source_type in ('manual', 'website', 'document', 'url')),
  source_name text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_knowledge_workspace_id_idx on public.product_knowledge (workspace_id);

create trigger product_knowledge_set_updated_at
  before update on public.product_knowledge
  for each row execute function public.set_updated_at();

alter table public.product_knowledge enable row level security;

create policy "members can view product knowledge in their workspaces"
  on public.product_knowledge for select
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can create product knowledge in their workspaces"
  on public.product_knowledge for insert
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "members can update product knowledge in their workspaces"
  on public.product_knowledge for update
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can delete product knowledge in their workspaces"
  on public.product_knowledge for delete
  using (workspace_id in (select public.user_workspace_ids()));

alter table public.products
  add column product_profile jsonb,
  add column product_profile_generated_at timestamptz;

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  operation text not null,
  model text not null,
  prompt_version text not null,
  input_hash text not null,
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric(10, 6),
  status text not null default 'succeeded' check (status in ('succeeded', 'failed')),
  created_at timestamptz not null default now()
);

create index ai_runs_workspace_id_idx on public.ai_runs (workspace_id);
create index ai_runs_cache_lookup_idx
  on public.ai_runs (workspace_id, operation, input_hash)
  where status = 'succeeded';

alter table public.ai_runs enable row level security;

-- Append-only usage ledger: members can view and insert, never update/delete.
create policy "members can view ai runs in their workspaces"
  on public.ai_runs for select
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can create ai runs in their workspaces"
  on public.ai_runs for insert
  with check (workspace_id in (select public.user_workspace_ids()));
