-- Follow-up to 20260904182540_tenancy_schema.sql: the performance advisor flagged three
-- policies that call auth.uid() directly instead of via a helper function, which forces
-- Postgres to re-evaluate it per row. Wrapping as (select auth.uid()) lets the planner
-- evaluate it once per query (auth_rls_initplan). The policies that already go through
-- user_account_ids()/user_business_ids()/user_product_ids() were not flagged.

drop policy "owners and admins can update their accounts" on public.accounts;
create policy "owners and admins can update their accounts"
  on public.accounts for update
  using (
    id in (
      select account_id from public.account_members
      where user_id = (select auth.uid()) and role in ('owner', 'admin')
    )
  );

drop policy "owners and admins can add members" on public.account_members;
create policy "owners and admins can add members"
  on public.account_members for insert
  with check (
    account_id in (
      select account_id from public.account_members
      where user_id = (select auth.uid()) and role in ('owner', 'admin')
    )
  );

drop policy "owners and admins can remove members" on public.account_members;
create policy "owners and admins can remove members"
  on public.account_members for delete
  using (
    account_id in (
      select account_id from public.account_members
      where user_id = (select auth.uid()) and role in ('owner', 'admin')
    )
  );
