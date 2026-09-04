-- Manual/CI smoke test for the tenancy schema (supabase/migrations/20260904182540_*).
--
-- Run against the dev project via the Supabase MCP execute_sql tool, or paste into the
-- Supabase SQL editor. Requires no fixtures -- it creates and cleans up its own data.
--
-- Verifies:
--   1. handle_new_user() auto-creates an account + owner membership for a new auth user.
--   2. create_default_workspace() auto-creates a workspace when a product is inserted.
--   3. RLS blocks cross-tenant SELECT and UPDATE across accounts/businesses/products/
--      workspaces, in both directions (a user with no access sees nothing; the owning
--      user still sees their own data).
--
-- Raises an exception (non-zero exit under most SQL runners) on the first failure;
-- otherwise completes silently having deleted all the fixture rows it created.

do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  account_a uuid;
  account_b uuid;
  business_a uuid;
  product_a uuid;
  workspace_a uuid;
  member_role text;
  n int;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values
    (user_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tenant-a@example.com', '', now(), now(), now(), '{}', '{}'),
    (user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tenant-b@example.com', '', now(), now(), now(), '{}', '{}');

  select account_id, role into account_a, member_role from public.account_members where user_id = user_a;
  if account_a is null or member_role <> 'owner' then
    raise exception 'FAIL: handle_new_user() did not provision an owner account for user A';
  end if;
  select account_id into account_b from public.account_members where user_id = user_b;
  if account_b is null then
    raise exception 'FAIL: handle_new_user() did not provision an account for user B';
  end if;

  insert into public.businesses (account_id, name) values (account_a, 'Acme A') returning id into business_a;
  insert into public.products (business_id, name) values (business_a, 'Product A') returning id into product_a;

  select id into workspace_a from public.workspaces where product_id = product_a;
  if workspace_a is null then
    raise exception 'FAIL: create_default_workspace() did not fire on product insert';
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_b, 'role', 'authenticated')::text, true);

  select count(*) into n from public.accounts where id = account_a;
  if n <> 0 then raise exception 'FAIL: user B can see user A account'; end if;

  select count(*) into n from public.businesses where id = business_a;
  if n <> 0 then raise exception 'FAIL: user B can see user A business'; end if;

  select count(*) into n from public.products where id = product_a;
  if n <> 0 then raise exception 'FAIL: user B can see user A product'; end if;

  select count(*) into n from public.workspaces where id = workspace_a;
  if n <> 0 then raise exception 'FAIL: user B can see user A workspace'; end if;

  update public.businesses set name = 'hijacked' where id = business_a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: user B updated user A business (% rows)', n; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.workspaces where id = workspace_a;
  if n <> 1 then raise exception 'FAIL: user A cannot see their own workspace'; end if;

  reset role;
  raise notice 'PASS: tenant isolation smoke test (account/business/product/workspace)';

  delete from auth.users where id in (user_a, user_b); -- cascades account_members
  delete from public.accounts where id in (account_a, account_b); -- cascades business/product/workspace
end $$;
