-- Epic 3 (BYOK AI) -- docs/byok-ai-requirements.md.
--
-- One connected AI provider per account (default scope is Account per the doc's §13, so
-- every business/product under it shares the same connection rather than re-asking for a
-- key per product). Connecting a different provider replaces this row rather than adding
-- a second one -- the product UI only ever shows a single "AI Provider" connection, not a
-- list.
--
-- encrypted_api_key is application-level AES-256-GCM ciphertext (lib/crypto/api-key.ts),
-- never the raw key -- RLS alone doesn't protect it from a compromised query built by
-- application code, so no query in lib/ai-providers/queries.ts (the UI-facing layer)
-- selects this column; only the router's internal credential lookup does, immediately
-- before decrypting for a single request.
create table public.ai_provider_credentials (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic', 'google')),
  encrypted_api_key text not null,
  key_fingerprint text not null,
  status text not null default 'connected' check (status in ('connected', 'error')),
  last_validated_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id)
);

create index ai_provider_credentials_account_id_idx on public.ai_provider_credentials (account_id);

create trigger ai_provider_credentials_set_updated_at
  before update on public.ai_provider_credentials
  for each row execute function public.set_updated_at();

alter table public.ai_provider_credentials enable row level security;

create policy "members can view their account's ai provider credential"
  on public.ai_provider_credentials for select
  using (account_id in (select public.user_account_ids()));

create policy "members can create their account's ai provider credential"
  on public.ai_provider_credentials for insert
  with check (account_id in (select public.user_account_ids()));

create policy "members can update their account's ai provider credential"
  on public.ai_provider_credentials for update
  using (account_id in (select public.user_account_ids()));

create policy "members can delete their account's ai provider credential"
  on public.ai_provider_credentials for delete
  using (account_id in (select public.user_account_ids()));

-- Extends ai_runs (blueprint §9/§15) for BYOK: which account's key was billed, which
-- provider actually served the request, how long it took, and a machine-readable error
-- code for the "AI unavailable" surface (GTM-031) without parsing last_error strings.
alter table public.ai_runs
  add column account_id uuid references public.accounts (id) on delete cascade,
  add column provider text,
  add column duration_ms integer,
  add column error_code text;

create index ai_runs_account_id_idx on public.ai_runs (account_id);
