-- Uploaded knowledge-source files (PDF/DOCX/text/images). Private bucket -- unlike
-- avatars, these can be real business documents, so nothing here is served publicly.
-- Path convention is <workspace_id>/<filename>; policies reuse the same
-- public.user_workspace_ids() helper the rest of this app's RLS already relies on
-- (20260904182540_tenancy_schema.sql) so access follows the same
-- account -> business -> product -> workspace chain as every other workspace-owned row.
insert into storage.buckets (id, name, public)
values ('knowledge-files', 'knowledge-files', false)
on conflict (id) do nothing;

create policy "Members can read their workspaces' knowledge files"
on storage.objects for select
using (
  bucket_id = 'knowledge-files'
  and (storage.foldername(name))[1]::uuid in (select public.user_workspace_ids())
);

create policy "Members can upload knowledge files to their workspaces"
on storage.objects for insert
with check (
  bucket_id = 'knowledge-files'
  and (storage.foldername(name))[1]::uuid in (select public.user_workspace_ids())
);

create policy "Members can delete their workspaces' knowledge files"
on storage.objects for delete
using (
  bucket_id = 'knowledge-files'
  and (storage.foldername(name))[1]::uuid in (select public.user_workspace_ids())
);
