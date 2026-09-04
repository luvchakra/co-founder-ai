-- Epic 9 Story 3: reply classification.
-- Only meaningful on inbound messages -- classifyReply() (lib/ai/classify-reply.ts) sets
-- both after an inbound reply is ingested. Nullable and unset for outbound messages and
-- for inbound messages that haven't been classified yet.

alter table public.messages
  add column classification text check (
    classification in (
      'interested',
      'not_interested',
      'question',
      'objection',
      'out_of_office',
      'unsubscribe',
      'other'
    )
  ),
  add column recommended_action text;
