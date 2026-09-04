-- Epic 9: Conversations.
-- A conversation is the thread of messages (outbound + inbound) with one prospect on one
-- channel. It's created lazily -- the first time a message is marked sent, or the first
-- time an inbound reply arrives for a prospect/channel with no open conversation -- rather
-- than up front, since most prospects never reply and we don't want empty threads.
--
-- status is the state machine (blueprint §21):
--   awaiting_reply -- we've sent something and are waiting to hear back
--   replied        -- the prospect has replied and we haven't followed up yet
--   closed         -- founder ended the thread (unsubscribed, not interested, done)

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  channel text not null check (channel in ('email', 'linkedin', 'whatsapp')),
  status text not null default 'awaiting_reply' check (status in ('awaiting_reply', 'replied', 'closed')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_workspace_id_idx on public.conversations (workspace_id);
create index conversations_prospect_id_idx on public.conversations (prospect_id);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

alter table public.conversations enable row level security;

create policy "members can view conversations in their workspaces"
  on public.conversations for select
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can create conversations in their workspaces"
  on public.conversations for insert
  with check (workspace_id in (select public.user_workspace_ids()));

create policy "members can update conversations in their workspaces"
  on public.conversations for update
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can delete conversations in their workspaces"
  on public.conversations for delete
  using (workspace_id in (select public.user_workspace_ids()));

-- Deferred from Epic 8's messages migration until this table existed (see that file's
-- comment). Nullable: pre-Epic-9 messages have no conversation.
alter table public.messages
  add column conversation_id uuid references public.conversations (id) on delete set null;

create index messages_conversation_id_idx on public.messages (conversation_id);
