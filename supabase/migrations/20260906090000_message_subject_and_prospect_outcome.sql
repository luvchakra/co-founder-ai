-- messages.subject: outbound email drafts previously concatenated "Subject: X\n\nBody"
-- into the single `content` column and regex-split it back apart at send time (see the
-- old lib/messages/send.ts). That round-trip through string concatenation was fragile --
-- a malformed split leaked the literal "Subject: ..." line into the sent email body.
-- generateOutreachMessage/generateReply already produce subject and body as separate
-- fields (OutreachMessageSchema); this column lets them stay separate all the way
-- through instead of being joined and re-parsed. Null for linkedin/whatsapp (no subject
-- line) and for messages created before this migration.
alter table public.messages add column subject text;

-- prospects.outcome: set when a conversation is closed (docs: "if won, show it in the
-- conversions tab as a customer"). Deliberately on the prospect, not the conversation --
-- a prospect can have conversations on multiple channels, but "did we win this account"
-- is one fact about the prospect as a whole.
alter table public.prospects
  add column outcome text not null default 'open' check (outcome in ('open', 'won', 'lost'));
