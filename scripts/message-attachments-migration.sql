-- Add optional attachment metadata to chat messages.
-- Files are stored in the private `property-files` storage bucket under
-- `chat/<tenant_id>/...` and served via short-lived signed URLs.
alter table public.messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint;
