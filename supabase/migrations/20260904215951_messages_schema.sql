-- Epic 8: Outreach.
-- conversation_id (present in docs/engineering-blueprint.md §9's messages table) is
-- intentionally omitted here -- the conversations table doesn't exist until Epic 9, which
-- will ALTER TABLE to add the column rather than have this migration forward-reference a
-- table that isn't built yet.
--
-- status is the human-approval gate (blueprint §20): AI Generated -> Draft -> Founder
-- Review -> Approved -> [founder copies it out and sends manually] -> Sent. No automated
-- sending exists yet (blueprint §19 explicitly allows copy/export for MVP), so "sent" is
-- set by the founder marking it, not by the app dispatching anything.

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  channel text not null check (channel in ('email', 'linkedin', 'whatsapp')),
  direction text not null default 'outbound' check (direction in ('outbound', 'inbound')),
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index messages_workspace_id_idx on public.messages (workspace_id);
create index messages_prospect_id_idx on public.messages (prospect_id);

create trigger messages_set_updated_at
  before update on public.messages
  for each row execute function public.set_updated_at();

alter table public.messages enable row level security;

create policy "members can view messages in their workspaces"
  on public.messages for select
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can create messages in their workspaces"
  on public.messages for insert
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "members can update messages in their workspaces"
  on public.messages for update
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can delete messages in their workspaces"
  on public.messages for delete
  using (workspace_id in (select public.user_workspace_ids()));
