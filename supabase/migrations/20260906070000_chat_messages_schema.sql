-- Persists the header AI assistant's conversation per workspace (i.e. per product --
-- every product has exactly one workspace) so history survives a page reload or
-- reopening the chat panel later, instead of living only in ai-chat-widget.tsx's React
-- state. Scoped to workspace_id like every other operational table (CLAUDE.md principle
-- 11); the account-level chat (opened with no business/product selected) attributes to
-- the same fallback workspace lib/ai/chat.ts already uses for usage-limit/ai_runs
-- attribution, so it never needs a nullable tenant boundary.
--
-- No update/delete policies: history is append-only and never pruned by the app (the
-- founder asked for it to persist, not to be editable or deletable from here).

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  follow_up text,
  created_at timestamptz not null default now()
);

create index chat_messages_workspace_id_created_at_idx
  on public.chat_messages (workspace_id, created_at);

alter table public.chat_messages enable row level security;

create policy "members can view chat messages in their workspaces"
  on public.chat_messages for select
  using (workspace_id in (select public.user_workspace_ids()));

create policy "members can create chat messages in their workspaces"
  on public.chat_messages for insert
  with check (workspace_id in (select public.user_workspace_ids()));
