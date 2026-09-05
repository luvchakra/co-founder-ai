-- Landing page "Show Interest" CTA (CoFounderAI UI & CTA Enhancement doc §2-3): captures
-- an email from an anonymous visitor before any account exists, so there's no
-- account_id/business_id/product_id/workspace_id to scope this to -- unlike every other
-- table in this schema, tenant isolation isn't the concern here; avoiding a duplicate
-- notification for the same address is (§3: "prevent duplicate accidental submissions
-- where practical").
create table public.interest_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- RLS enabled with deliberately zero policies: submissions come from anonymous visitors
-- with no auth.uid() to scope a policy to, so the only access path is the service-role
-- admin client from lib/interest/mutations.ts, called from a server action -- never the
-- browser, never the RLS-scoped client (see lib/supabase/admin.ts's own docstring on when
-- bypassing RLS is appropriate).
alter table public.interest_signups enable row level security;
