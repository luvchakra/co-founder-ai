-- Epic 11 Story 2: extends tests/sql/tenant_isolation_smoke.sql (accounts/businesses/
-- products/workspaces, from Epic 2) to every workspace-scoped table added since
-- (Epics 3-9). All of them share the same RLS pattern -- "workspace_id in (select
-- public.user_workspace_ids())" -- so this checks that pattern actually holds for each
-- table's real policies, not just that the SQL text looks the same.
--
-- Run via the Supabase MCP execute_sql tool against the dev project, or paste into the
-- SQL editor. Requires no fixtures -- it creates and cleans up its own data. Raises an
-- exception on the first failure; otherwise completes silently having deleted every
-- fixture row it created.

do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  account_a uuid;
  account_b uuid;
  business_a uuid;
  product_a uuid;
  workspace_a uuid;
  prospect_a uuid;
  contact_a uuid;
  conversation_a uuid;
  n int;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values
    (user_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'wsiso-a@example.com', '', now(), now(), now(), '{}', '{}'),
    (user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'wsiso-b@example.com', '', now(), now(), now(), '{}', '{}');

  select account_id into account_a from public.account_members where user_id = user_a;
  select account_id into account_b from public.account_members where user_id = user_b;

  insert into public.businesses (account_id, name) values (account_a, 'WS Iso A') returning id into business_a;
  insert into public.products (business_id, name) values (business_a, 'Product A') returning id into product_a;
  select id into workspace_a from public.workspaces where product_id = product_a;

  -- Fixtures across every workspace-scoped table, all under tenant A.
  insert into public.product_knowledge (workspace_id, source_type, source_name, content)
    values (workspace_a, 'manual', 'notes', 'secret product notes');

  insert into public.ai_runs (workspace_id, operation, model, prompt_version, input_hash)
    values (workspace_a, 'understand_product', 'claude-sonnet-5', 'v1', 'hash');

  insert into public.icp_profiles (workspace_id) values (workspace_a);

  insert into public.prospects (workspace_id, company_name) values (workspace_a, 'Target Co')
    returning id into prospect_a;

  insert into public.contacts (workspace_id, prospect_id, first_name) values (workspace_a, prospect_a, 'Jane')
    returning id into contact_a;

  insert into public.prospect_research (workspace_id, prospect_id, summary)
    values (workspace_a, prospect_a, 'secret research');

  insert into public.prospect_scores (workspace_id, prospect_id, icp_score, intent_score, timing_score, overall_score)
    values (workspace_a, prospect_a, 80, 70, 60, 70);

  insert into public.outreach_strategies (workspace_id, prospect_id, strategy, channel, reason, key_message, cta)
    values (workspace_a, prospect_a, 'strategy', 'email', 'reason', 'message', 'cta');

  insert into public.conversations (workspace_id, prospect_id, contact_id, channel)
    values (workspace_a, prospect_a, contact_a, 'email')
    returning id into conversation_a;

  insert into public.messages (workspace_id, prospect_id, contact_id, conversation_id, channel, content)
    values (workspace_a, prospect_a, contact_a, conversation_a, 'email', 'secret message');

  -- Switch to tenant B and confirm none of tenant A's rows are visible or writable.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_b, 'role', 'authenticated')::text, true);

  select count(*) into n from public.product_knowledge where workspace_id = workspace_a;
  if n <> 0 then raise exception 'FAIL: user B can see tenant A product_knowledge'; end if;

  select count(*) into n from public.ai_runs where workspace_id = workspace_a;
  if n <> 0 then raise exception 'FAIL: user B can see tenant A ai_runs'; end if;

  select count(*) into n from public.icp_profiles where workspace_id = workspace_a;
  if n <> 0 then raise exception 'FAIL: user B can see tenant A icp_profiles'; end if;

  select count(*) into n from public.prospects where id = prospect_a;
  if n <> 0 then raise exception 'FAIL: user B can see tenant A prospects'; end if;

  select count(*) into n from public.contacts where id = contact_a;
  if n <> 0 then raise exception 'FAIL: user B can see tenant A contacts'; end if;

  select count(*) into n from public.prospect_research where prospect_id = prospect_a;
  if n <> 0 then raise exception 'FAIL: user B can see tenant A prospect_research'; end if;

  select count(*) into n from public.prospect_scores where prospect_id = prospect_a;
  if n <> 0 then raise exception 'FAIL: user B can see tenant A prospect_scores'; end if;

  select count(*) into n from public.outreach_strategies where prospect_id = prospect_a;
  if n <> 0 then raise exception 'FAIL: user B can see tenant A outreach_strategies'; end if;

  select count(*) into n from public.conversations where id = conversation_a;
  if n <> 0 then raise exception 'FAIL: user B can see tenant A conversations'; end if;

  select count(*) into n from public.messages where conversation_id = conversation_a;
  if n <> 0 then raise exception 'FAIL: user B can see tenant A messages'; end if;

  -- Spot-check writes are blocked too, not just reads (every table above has an
  -- analogous "for update ... using (workspace_id in user_workspace_ids())" policy).
  update public.prospects set company_name = 'hijacked' where id = prospect_a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: user B updated tenant A prospect (% rows)', n; end if;

  update public.messages set content = 'hijacked' where conversation_id = conversation_a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: user B updated tenant A message (% rows)', n; end if;

  -- Tenant A must still see their own data.
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.messages where conversation_id = conversation_a;
  if n <> 1 then raise exception 'FAIL: tenant A cannot see their own message'; end if;

  reset role;
  raise notice 'PASS: tenant isolation across all workspace-scoped tables (Epics 3-9)';

  delete from auth.users where id in (user_a, user_b); -- cascades account_members
  delete from public.accounts where id in (account_a, account_b); -- cascades everything else
end $$;
