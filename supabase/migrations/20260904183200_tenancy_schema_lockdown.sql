-- Follow-up to 20260904182540_tenancy_schema.sql, addressing Supabase security-advisor
-- warnings observed after applying it:
--
-- 1. set_updated_at had a mutable search_path (function_search_path_mutable).
-- 2. handle_new_user / create_default_workspace are trigger-only functions but were
--    directly callable via PostgREST RPC by anon/authenticated (Supabase grants EXECUTE
--    to anon/authenticated/service_role by default on every new function in `public` via
--    ALTER DEFAULT PRIVILEGES, independent of the `public` pseudo-role revoke already
--    issued for the four user_*_ids() functions).
-- 3. user_account_ids/user_business_ids/user_product_ids/user_workspace_ids were still
--    directly callable by `anon` for the same reason (harmless in practice, since
--    auth.uid() is null for anon and every query filters on it, but tightened anyway).

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.create_default_workspace() from public, anon, authenticated;

revoke execute on function public.user_account_ids() from anon;
revoke execute on function public.user_business_ids() from anon;
revoke execute on function public.user_product_ids() from anon;
revoke execute on function public.user_workspace_ids() from anon;
