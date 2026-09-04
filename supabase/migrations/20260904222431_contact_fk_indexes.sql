-- Epic 11 Story 2: Supabase performance advisors flagged three contact_id foreign keys
-- with no covering index (conversations, messages, outreach_strategies) -- all three
-- filter by contact in the prospect detail page's queries and would do a sequential scan
-- on delete cascade from contacts without one.

create index conversations_contact_id_idx on public.conversations (contact_id);
create index messages_contact_id_idx on public.messages (contact_id);
create index outreach_strategies_contact_id_idx on public.outreach_strategies (contact_id);
