-- Landing page epic S3 (docs/landing-page-requirements.md): signup now collects a
-- Name field. Prefer it for the auto-created account's name over the email-prefix
-- fallback handle_new_user() used before -- same trigger, just a better name source
-- when Supabase Auth's raw_user_meta_data.full_name is present (set via
-- supabase.auth.signUp's options.data).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_account_id uuid;
begin
  insert into public.accounts (name)
  values (
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'My'
    ) || '''s Account'
  )
  returning id into new_account_id;

  insert into public.account_members (account_id, user_id, role)
  values (new_account_id, new.id, 'owner');

  return new;
end;
$$;
