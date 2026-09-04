-- Epic 2: Multi-tenancy foundation.
-- Hierarchy: auth.users -> accounts -> businesses -> products -> workspaces.
-- workspace_id is the preferred operational boundary for everything built on top of this
-- (Epic 3+). See docs/engineering-blueprint.md §6-9.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.account_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (account_id, user_id)
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  name text not null,
  description text,
  website text,
  industry text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  description text,
  website text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null default 'Default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index account_members_user_id_idx on public.account_members (user_id);
create index account_members_account_id_idx on public.account_members (account_id);
create index businesses_account_id_idx on public.businesses (account_id);
create index products_business_id_idx on public.products (business_id);
create index workspaces_product_id_idx on public.workspaces (product_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tenant-resolution helper functions.
--
-- SECURITY DEFINER so the body runs with the owning (migration) role's privileges and is
-- NOT itself subject to the RLS policies below -- this is what breaks the recursion that
-- would otherwise occur (a policy on account_members calling a function that queries
-- account_members through that same policy). Each function explicitly filters by
-- auth.uid(), so it never leaks another user's data despite bypassing RLS internally.
-- ---------------------------------------------------------------------------

create function public.user_account_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select account_id from public.account_members where user_id = auth.uid();
$$;

create function public.user_business_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.id from public.businesses b where b.account_id in (select public.user_account_ids());
$$;

create function public.user_product_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id from public.products p where p.business_id in (select public.user_business_ids());
$$;

create function public.user_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select w.id from public.workspaces w where w.product_id in (select public.user_product_ids());
$$;

revoke execute on function public.user_account_ids() from public;
revoke execute on function public.user_business_ids() from public;
revoke execute on function public.user_product_ids() from public;
revoke execute on function public.user_workspace_ids() from public;
grant execute on function public.user_account_ids() to authenticated;
grant execute on function public.user_business_ids() to authenticated;
grant execute on function public.user_product_ids() to authenticated;
grant execute on function public.user_workspace_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.accounts enable row level security;
alter table public.account_members enable row level security;
alter table public.businesses enable row level security;
alter table public.products enable row level security;
alter table public.workspaces enable row level security;

-- accounts: members can view; owners/admins can update. No client-side insert/delete --
-- accounts are created only via handle_new_user() below.
create policy "members can view their accounts"
  on public.accounts for select
  using (id in (select public.user_account_ids()));

create policy "owners and admins can update their accounts"
  on public.accounts for update
  using (
    id in (
      select account_id from public.account_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- account_members: members can view membership of their own accounts; owners/admins can
-- manage membership (used by future multi-user invites -- not exposed in MVP UI yet).
create policy "members can view membership of their accounts"
  on public.account_members for select
  using (account_id in (select public.user_account_ids()));

create policy "owners and admins can add members"
  on public.account_members for insert
  with check (
    account_id in (
      select account_id from public.account_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "owners and admins can remove members"
  on public.account_members for delete
  using (
    account_id in (
      select account_id from public.account_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- businesses: any member of the owning account can view/create/update/delete.
create policy "members can view businesses in their account"
  on public.businesses for select
  using (account_id in (select public.user_account_ids()));

create policy "members can create businesses in their account"
  on public.businesses for insert
  with check (account_id in (select public.user_account_ids()));

create policy "members can update businesses in their account"
  on public.businesses for update
  using (account_id in (select public.user_account_ids()));

create policy "members can delete businesses in their account"
  on public.businesses for delete
  using (account_id in (select public.user_account_ids()));

-- products: any member of the owning business's account.
create policy "members can view products in their businesses"
  on public.products for select
  using (business_id in (select public.user_business_ids()));

create policy "members can create products in their businesses"
  on public.products for insert
  with check (business_id in (select public.user_business_ids()));

create policy "members can update products in their businesses"
  on public.products for update
  using (business_id in (select public.user_business_ids()));

create policy "members can delete products in their businesses"
  on public.products for delete
  using (business_id in (select public.user_business_ids()));

-- workspaces: view/update only -- creation happens via create_default_workspace() below,
-- deletion is out of MVP scope (soft-delete semantics come later, see blueprint §123).
create policy "members can view workspaces in their products"
  on public.workspaces for select
  using (product_id in (select public.user_product_ids()));

create policy "members can update workspaces in their products"
  on public.workspaces for update
  using (product_id in (select public.user_product_ids()));

-- ---------------------------------------------------------------------------
-- Auto-provisioning
-- ---------------------------------------------------------------------------

-- Every new auth user gets their own account as owner (blueprint §9: "initially assume
-- one account per user", but the account_members join table already supports more).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_account_id uuid;
begin
  insert into public.accounts (name)
  values (coalesce(nullif(split_part(new.email, '@', 1), ''), 'My') || '''s Account')
  returning id into new_account_id;

  insert into public.account_members (account_id, user_id, role)
  values (new_account_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Every product gets at least one GTM workspace (blueprint §12: "Every product gets at
-- least one GTM workspace").
create function public.create_default_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspaces (product_id, name) values (new.id, 'Default');
  return new;
end;
$$;

create trigger on_product_created
  after insert on public.products
  for each row execute function public.create_default_workspace();
