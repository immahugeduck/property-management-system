-- =============================================================================
-- Maintenance triage (text/call intake) — schema additions
--
-- Lets the maintenance-triage-agent service (Twilio SMS/voice webhooks) file
-- tenant texts and calls as real maintenance requests in Property HQ, keep a
-- full message log, and drive the schedule/complete notifications.
--
-- Additive only: new columns default safely, nothing existing is renamed or
-- dropped, and the Property HQ app keeps working without code changes.
-- The triage service writes with the service-role key (bypasses RLS); the
-- policies below cover what managers and tenants can read from the app.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Phone normalization
-- Tenants' phone numbers are free text ("(765) 555-0123", "765.555.0123"...).
-- Incoming texts arrive as E.164 (+17655550123), so match on a normalized copy.
-- ---------------------------------------------------------------------------
create or replace function public.normalize_us_phone(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when d ~ '^[0-9]{10}$' then '+1' || d
    when d ~ '^1[0-9]{10}$' then '+' || d
    when raw ~ '^\s*\+' and d ~ '^[1-9][0-9]{7,14}$' then '+' || d
    else null
  end
  from (select regexp_replace(coalesce(raw, ''), '[^0-9]', '', 'g') as d) s;
$$;

alter table public.tenants
  add column if not exists phone_e164 text
  generated always as (public.normalize_us_phone(phone)) stored;

create index if not exists idx_tenants_user_phone_e164
  on public.tenants (user_id, phone_e164)
  where phone_e164 is not null;

-- ---------------------------------------------------------------------------
-- Maintenance requests: job number, source, exact schedule/completion times
-- ---------------------------------------------------------------------------
create sequence if not exists public.maintenance_job_number_seq start with 1001;

alter table public.maintenance_requests
  -- Short number staff can text back ("1042 Tuesday 3pm", "1042 done").
  add column if not exists job_number bigint
    default nextval('public.maintenance_job_number_seq') not null,
  -- Where the request came from: 'app' (dashboard or tenant portal), 'sms', 'voice'.
  add column if not exists source text default 'app' not null,
  -- Exact appointment time (scheduled_date only holds a day).
  add column if not exists scheduled_at timestamp with time zone,
  -- Exact completion time; completed_date is kept for the existing app.
  add column if not exists completed_at timestamp with time zone,
  -- When the "job completed" texts went to tenant and property manager.
  add column if not exists completion_notified_at timestamp with time zone;

alter sequence public.maintenance_job_number_seq
  owned by public.maintenance_requests.job_number;

alter table public.maintenance_requests
  add constraint maintenance_requests_job_number_key unique (job_number),
  add constraint maintenance_requests_source_check
    check (source in ('app', 'sms', 'voice'));

-- Stamp completed_at whenever a request becomes completed, no matter which
-- path did it (dashboard status menu, edit form, or a "done" text). Reopening
-- clears it so a second completion is announced again.
create or replace function public.maintenance_requests_track_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' then
    if tg_op = 'INSERT' or old.status is distinct from 'completed' then
      new.completed_at := coalesce(new.completed_at, now());
    end if;
    if new.completed_date is null then
      new.completed_date := (new.completed_at at time zone 'America/Indiana/Indianapolis')::date;
    end if;
  elsif tg_op = 'UPDATE' and old.status = 'completed' then
    new.completed_at := null;
    new.completion_notified_at := null;
  end if;
  return new;
end;
$$;

create trigger maintenance_requests_track_completion
  before insert or update of status on public.maintenance_requests
  for each row execute function public.maintenance_requests_track_completion();

create index if not exists idx_maintenance_requests_completion_pending
  on public.maintenance_requests (completed_at)
  where completed_at is not null and completion_notified_at is null;

-- ---------------------------------------------------------------------------
-- Triage settings: one row per manager account / Twilio number.
-- Changing who receives alerts, hours or wording is a row update, not a deploy.
-- ---------------------------------------------------------------------------
create table if not exists public.triage_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  twilio_number text not null unique,
  maintenance_phone text,
  maintenance_email text,
  manager_phone text,
  manager_email text,
  timezone text default 'America/Indiana/Indianapolis' not null,
  -- ISO weekdays (1 = Monday ... 7 = Sunday) with normal hours.
  open_days smallint[] default '{1,2,3,4,5,6}'::smallint[] not null,
  open_time time default '09:00' not null,
  close_time time default '18:00' not null,
  emergency_reply text default 'Please keep your phone near as someone will be reaching out to you within 30 minutes. If you have not gotten a call, call 317-645-6088. If this is an emergency, dial 911.' not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint triage_settings_twilio_number_e164 check (twilio_number ~ '^\+[1-9][0-9]{7,14}$')
);

create trigger triage_settings_updated_at
  before update on public.triage_settings
  for each row execute function public.set_updated_at();

alter table public.triage_settings enable row level security;

create policy triage_settings_manager on public.triage_settings
  as permissive for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Message log: every text and call in or out, for the AI's conversation
-- memory and for later review/notes.
-- ---------------------------------------------------------------------------
create table if not exists public.sms_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  channel text default 'sms' not null check (channel in ('sms', 'voice')),
  -- Who is on the other end of this message.
  party text not null check (party in ('tenant', 'maintenance', 'manager', 'unknown')),
  kind text not null check (kind in (
    'message',            -- ordinary inbound/outbound conversation
    'new_request_alert',  -- to maintenance / property manager
    'emergency_alert',    -- urgent alert to maintenance (text or call)
    'schedule_notice',    -- appointment confirmed
    'completion_notice'   -- job completed
  )),
  from_number text not null,
  to_number text not null,
  body text not null default '',
  -- Twilio's MessageSid/CallSid. Unique so a Twilio retry can't double-log.
  twilio_sid text unique,
  status text,
  error text,
  tenant_id uuid references public.tenants(id) on delete set null,
  maintenance_request_id uuid references public.maintenance_requests(id) on delete set null,
  -- Completion date carried on completion notices, as sent.
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_sms_messages_user_created
  on public.sms_messages (user_id, created_at desc);
create index if not exists idx_sms_messages_tenant
  on public.sms_messages (tenant_id, created_at desc);
create index if not exists idx_sms_messages_request
  on public.sms_messages (maintenance_request_id, created_at);
create index if not exists idx_sms_messages_from
  on public.sms_messages (user_id, from_number, created_at desc);

alter table public.sms_messages enable row level security;

-- Managers read their own log; tenants read messages tied to them.
-- No insert/update/delete policies: only the triage service (service role)
-- writes, so the log can't be edited from the app.
create policy sms_messages_select_manager on public.sms_messages
  as permissive for select to authenticated
  using ((select auth.uid()) = user_id);

create policy sms_messages_select_tenant on public.sms_messages
  as permissive for select to authenticated
  using (party = 'tenant' and public.is_tenant_of(tenant_id));
