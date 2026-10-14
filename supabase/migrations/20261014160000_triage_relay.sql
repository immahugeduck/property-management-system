-- =============================================================================
-- Maintenance triage: relay staff replies back to tenants
--
-- Alerts and forwarded tenant questions record who the staff reply should go
-- back to, so the maintenance phone can answer a tenant by replying to the
-- alert text. Additive only.
-- =============================================================================

-- The tenant (or unknown sender) a staff reply to this message should reach.
alter table public.sms_messages
  add column if not exists reply_to_number text;

-- New message kinds: a tenant question forwarded to maintenance, and a staff
-- reply relayed back to the tenant.
alter table public.sms_messages drop constraint if exists sms_messages_kind_check;
alter table public.sms_messages
  add constraint sms_messages_kind_check check (kind in (
    'message',
    'new_request_alert',
    'emergency_alert',
    'schedule_notice',
    'completion_notice',
    'tenant_question',
    'staff_relay'
  ));

-- "Most recent relayable text sent to this staff phone."
create index if not exists idx_sms_messages_relay
  on public.sms_messages (user_id, to_number, created_at desc)
  where reply_to_number is not null;
