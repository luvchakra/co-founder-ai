-- Prospects Pipeline Redesign R1/R2 (docs/prospects-pipeline-redesign-requirements.md):
-- real outbound sending needs a status a provider send can actually fail into, instead
-- of the founder self-reporting "sent". Adds 'failed' to the status machine plus the
-- two columns lib/messages/send.ts needs: why a send failed, and the provider's id for
-- the message so an async delivery-status webhook can find it again.

alter table public.messages
  drop constraint messages_status_check;

alter table public.messages
  add constraint messages_status_check
  check (status in ('draft', 'approved', 'sent', 'failed'));

alter table public.messages
  add column failure_reason text,
  add column provider_message_id text;

create index messages_provider_message_id_idx on public.messages (provider_message_id);
