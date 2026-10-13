-- =============================================================================
-- Property HQ — full database schema snapshot
--
-- Exported 2026-10-13 from the live Supabase project "supabase-propertyhq"
-- (ref fxmlwozvjzzntorolhtv) by reading the Postgres catalog directly, so it
-- reflects what is actually deployed, not what earlier migration scripts
-- intended. Running this file against an empty Supabase project recreates the
-- complete structure: tables, constraints, indexes, functions, triggers,
-- row-level security policies, the storage bucket and its policies.
--
-- It contains NO data and NO secrets. See supabase/README.md for the secrets,
-- edge functions and known issues that go with it.
--
-- Safe to re-run on a fresh project; it is not written to be applied on top
-- of an existing copy of this schema (constraints and policies would collide).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions (Supabase enables most of these by default)
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_stat_statements with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists supabase_vault with schema vault;
create extension if not exists "uuid-ossp" with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  property_id uuid,
  category text default 'other'::text not null,
  description text not null,
  amount numeric not null,
  date date default CURRENT_DATE not null,
  vendor text,
  receipt_url text,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.file_folders (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  name text not null,
  parent_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.files (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  folder_id uuid,
  tenant_id uuid,
  property_id uuid,
  owner_id uuid,
  file_name text not null,
  file_size bigint default 0 not null,
  mime_type text,
  storage_path text not null,
  is_template boolean default false not null,
  description text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  document_type text
);

create table if not exists public.lease_templates (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  name text not null,
  description text,
  storage_path text not null,
  page_count integer default 1 not null,
  page_sizes jsonb default '[]'::jsonb not null,
  fields jsonb default '[]'::jsonb not null,
  slug text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.leases (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  template_id uuid,
  tenant_id uuid,
  property_id uuid,
  title text default 'Lease Agreement'::text not null,
  status text default 'draft'::text not null,
  "values" jsonb default '{}'::jsonb not null,
  signed_storage_path text,
  signed_file_id uuid,
  signer_name text,
  sent_at timestamp with time zone,
  signed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.maintenance_requests (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  property_id uuid not null,
  tenant_id uuid,
  title text not null,
  description text not null,
  category text default 'general'::text not null,
  urgency text default 'medium'::text not null,
  status text default 'open'::text not null,
  estimated_cost numeric(10,2),
  actual_cost numeric(10,2),
  scheduled_date date,
  completed_date date,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  photo_paths text[] default '{}'::text[],
  vendor_id uuid,
  reported_by_name text
);

create table if not exists public.messages (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  tenant_id uuid not null,
  property_id uuid,
  subject text not null,
  body text not null,
  direction text default 'outbound'::text not null,
  is_read boolean default false,
  created_at timestamp with time zone default now() not null,
  sender_role text default 'manager'::text not null,
  attachment_path text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint
);

create table if not exists public.notifications (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  recipient_type text default 'manager'::text,
  type text not null,
  title text not null,
  message text not null,
  link text,
  related_id uuid,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists public.properties (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  name text not null,
  address text not null,
  city text not null,
  state text not null,
  zip_code text not null,
  property_type text default 'apartment'::text not null,
  bedrooms integer default 1,
  bathrooms numeric default 1,
  square_feet integer,
  monthly_rent numeric default 0 not null,
  status text default 'vacant'::text not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  owner_id uuid
);

create table if not exists public.property_owners (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  company_name text,
  address text,
  city text,
  state text,
  zip_code text,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.rent_payments (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  tenant_id uuid not null,
  property_id uuid not null,
  amount numeric not null,
  due_date date not null,
  paid_date date,
  status text default 'pending'::text not null,
  payment_method text,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  invoice_number text,
  is_recurring boolean default false,
  recurring_day integer default 1,
  rent_schedule_id uuid,
  stripe_session_id text,
  stripe_payment_intent text,
  receipt_number text
);

create table if not exists public.rent_schedules (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  tenant_id uuid not null,
  property_id uuid,
  amount numeric not null,
  day_of_month integer default 1 not null,
  active boolean default true,
  last_generated_for date,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.stripe_webhook_events (
  id uuid default gen_random_uuid() not null,
  event_id text not null,
  type text not null,
  payload jsonb not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.tenant_invites (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  tenant_id uuid not null,
  email text not null,
  token text not null,
  status text default 'pending'::text not null,
  expires_at timestamp with time zone default (now() + '14 days'::interval) not null,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.tenants (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  property_id uuid,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  lease_start date,
  lease_end date,
  rent_amount numeric default 0 not null,
  security_deposit numeric default 0,
  status text default 'active'::text not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  auth_user_id uuid,
  portal_enabled boolean default false,
  invited_at timestamp with time zone,
  portal_activated_at timestamp with time zone
);

-- Leftover from the Supabase starter template; not used by the app.
create table if not exists public.todos (
  id bigint generated by default as identity not null,
  user_id uuid not null,
  task text,
  is_complete boolean default false,
  inserted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.user_profiles (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  from_name text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.vendor_payments (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  vendor_id uuid not null,
  maintenance_request_id uuid,
  amount numeric(10,2) not null,
  date date default CURRENT_DATE not null,
  payment_method text,
  reference_number text,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.vendors (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  name text not null,
  company_name text,
  specialty text,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- ---------------------------------------------------------------------------
-- Primary keys, unique and check constraints
-- ---------------------------------------------------------------------------
alter table public.expenses add constraint expenses_pkey PRIMARY KEY (id);
alter table public.file_folders add constraint file_folders_pkey PRIMARY KEY (id);
alter table public.files add constraint files_document_type_check CHECK ((document_type = ANY (ARRAY['lease'::text, 'addendum'::text, 'notice'::text])));
alter table public.files add constraint files_pkey PRIMARY KEY (id);
alter table public.lease_templates add constraint lease_templates_pkey PRIMARY KEY (id);
alter table public.leases add constraint leases_pkey PRIMARY KEY (id);
alter table public.maintenance_requests add constraint maintenance_requests_pkey PRIMARY KEY (id);
alter table public.messages add constraint messages_pkey PRIMARY KEY (id);
alter table public.notifications add constraint notifications_pkey PRIMARY KEY (id);
alter table public.properties add constraint properties_pkey PRIMARY KEY (id);
alter table public.property_owners add constraint property_owners_pkey PRIMARY KEY (id);
alter table public.rent_payments add constraint rent_payments_pkey PRIMARY KEY (id);
alter table public.rent_schedules add constraint rent_schedules_pkey PRIMARY KEY (id);
alter table public.stripe_webhook_events add constraint stripe_webhook_events_event_id_key UNIQUE (event_id);
alter table public.stripe_webhook_events add constraint stripe_webhook_events_pkey PRIMARY KEY (id);
alter table public.tenant_invites add constraint tenant_invites_pkey PRIMARY KEY (id);
alter table public.tenant_invites add constraint tenant_invites_token_key UNIQUE (token);
alter table public.tenants add constraint tenants_pkey PRIMARY KEY (id);
alter table public.todos add constraint todos_pkey PRIMARY KEY (id);
alter table public.todos add constraint todos_task_check CHECK ((char_length(task) > 3));
alter table public.user_profiles add constraint user_profiles_pkey PRIMARY KEY (id);
alter table public.user_profiles add constraint user_profiles_user_id_key UNIQUE (user_id);
alter table public.vendor_payments add constraint vendor_payments_pkey PRIMARY KEY (id);
alter table public.vendors add constraint vendors_pkey PRIMARY KEY (id);

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------
alter table public.expenses add constraint expenses_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;
alter table public.expenses add constraint expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.file_folders add constraint file_folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.file_folders(id) ON DELETE CASCADE;
alter table public.file_folders add constraint file_folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.files add constraint files_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.file_folders(id) ON DELETE SET NULL;
alter table public.files add constraint files_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.property_owners(id) ON DELETE SET NULL;
alter table public.files add constraint files_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;
alter table public.files add constraint files_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
alter table public.files add constraint files_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.lease_templates add constraint lease_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.leases add constraint leases_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;
alter table public.leases add constraint leases_signed_file_id_fkey FOREIGN KEY (signed_file_id) REFERENCES public.files(id) ON DELETE SET NULL;
alter table public.leases add constraint leases_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.lease_templates(id) ON DELETE SET NULL;
alter table public.leases add constraint leases_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
alter table public.leases add constraint leases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.maintenance_requests add constraint maintenance_requests_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
alter table public.maintenance_requests add constraint maintenance_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
alter table public.maintenance_requests add constraint maintenance_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.maintenance_requests add constraint maintenance_requests_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;
alter table public.messages add constraint messages_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;
alter table public.messages add constraint messages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
alter table public.messages add constraint messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.notifications add constraint notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.properties add constraint properties_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.property_owners(id) ON DELETE SET NULL;
alter table public.properties add constraint properties_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.property_owners add constraint property_owners_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.rent_payments add constraint rent_payments_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
alter table public.rent_payments add constraint rent_payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
alter table public.rent_payments add constraint rent_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.rent_schedules add constraint rent_schedules_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;
alter table public.rent_schedules add constraint rent_schedules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
alter table public.rent_schedules add constraint rent_schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.tenant_invites add constraint tenant_invites_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
alter table public.tenant_invites add constraint tenant_invites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.tenants add constraint tenants_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.tenants add constraint tenants_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;
alter table public.tenants add constraint tenants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.todos add constraint todos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
alter table public.user_profiles add constraint user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.vendor_payments add constraint vendor_payments_maintenance_request_id_fkey FOREIGN KEY (maintenance_request_id) REFERENCES public.maintenance_requests(id) ON DELETE SET NULL;
alter table public.vendor_payments add constraint vendor_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.vendor_payments add constraint vendor_payments_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;
alter table public.vendors add constraint vendors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_expenses_category ON public.expenses USING btree (category);
CREATE INDEX idx_expenses_date ON public.expenses USING btree (date DESC);
CREATE INDEX idx_expenses_property_id ON public.expenses USING btree (property_id);
CREATE INDEX idx_expenses_user_id ON public.expenses USING btree (user_id);
CREATE INDEX idx_file_folders_parent_id ON public.file_folders USING btree (parent_id);
CREATE INDEX idx_file_folders_user_id ON public.file_folders USING btree (user_id);
CREATE INDEX idx_files_folder_id ON public.files USING btree (folder_id);
CREATE INDEX idx_files_is_template ON public.files USING btree (is_template);
CREATE INDEX idx_files_owner_id ON public.files USING btree (owner_id);
CREATE INDEX idx_files_property_id ON public.files USING btree (property_id);
CREATE INDEX idx_files_tenant_id ON public.files USING btree (tenant_id);
CREATE INDEX idx_files_user_id ON public.files USING btree (user_id);
CREATE UNIQUE INDEX idx_lease_templates_user_slug ON public.lease_templates USING btree (user_id, slug) WHERE (slug IS NOT NULL);
CREATE INDEX idx_leases_template_id ON public.leases USING btree (template_id);
CREATE INDEX idx_leases_tenant_id ON public.leases USING btree (tenant_id);
CREATE INDEX idx_leases_user_id ON public.leases USING btree (user_id);
CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);
CREATE INDEX idx_messages_property_id ON public.messages USING btree (property_id);
CREATE INDEX idx_messages_tenant_id ON public.messages USING btree (tenant_id);
CREATE INDEX idx_messages_user_id ON public.messages USING btree (user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);
CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX idx_properties_status ON public.properties USING btree (status);
CREATE INDEX idx_properties_user_id ON public.properties USING btree (user_id);
CREATE INDEX idx_rent_payments_due_date ON public.rent_payments USING btree (due_date);
CREATE INDEX idx_rent_payments_property_id ON public.rent_payments USING btree (property_id);
CREATE INDEX idx_rent_payments_status ON public.rent_payments USING btree (status);
CREATE INDEX idx_rent_payments_tenant_id ON public.rent_payments USING btree (tenant_id);
CREATE INDEX idx_rent_payments_user_id ON public.rent_payments USING btree (user_id);
CREATE UNIQUE INDEX rent_payments_tenant_due_unique ON public.rent_payments USING btree (tenant_id, due_date) WHERE (is_recurring = true);
CREATE INDEX idx_rent_schedules_tenant_id ON public.rent_schedules USING btree (tenant_id);
CREATE INDEX idx_tenant_invites_tenant_id ON public.tenant_invites USING btree (tenant_id);
CREATE INDEX idx_tenant_invites_token ON public.tenant_invites USING btree (token);
CREATE INDEX idx_tenants_auth_user_id ON public.tenants USING btree (auth_user_id);
CREATE INDEX idx_tenants_email_lower ON public.tenants USING btree (lower(email));
CREATE INDEX idx_tenants_property_id ON public.tenants USING btree (property_id);
CREATE INDEX idx_tenants_status ON public.tenants USING btree (status);
CREATE INDEX idx_tenants_user_id ON public.tenants USING btree (user_id);

-- ---------------------------------------------------------------------------
-- Functions (after tables: is_tenant_of's SQL body references public.tenants)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_tenant_of(p_tenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = p_tenant_id AND t.auth_user_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $function$
;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_lease_templates_updated BEFORE UPDATE ON public.lease_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leases_updated BEFORE UPDATE ON public.leases FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER vendor_payments_updated_at BEFORE UPDATE ON public.vendor_payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security: enabled on every table
-- ---------------------------------------------------------------------------
alter table public.expenses enable row level security;
alter table public.file_folders enable row level security;
alter table public.files enable row level security;
alter table public.lease_templates enable row level security;
alter table public.leases enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.properties enable row level security;
alter table public.property_owners enable row level security;
alter table public.rent_payments enable row level security;
alter table public.rent_schedules enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.tenant_invites enable row level security;
alter table public.tenants enable row level security;
alter table public.todos enable row level security;
alter table public.user_profiles enable row level security;
alter table public.vendor_payments enable row level security;
alter table public.vendors enable row level security;

-- ---------------------------------------------------------------------------
-- Row-level security policies
-- ---------------------------------------------------------------------------
create policy expenses_delete_own on public.expenses as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));

create policy expenses_insert_own on public.expenses as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));

create policy expenses_select_own on public.expenses as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));

create policy expenses_update_own on public.expenses as PERMISSIVE for UPDATE to public
  using ((auth.uid() = user_id));

create policy file_folders_owner on public.file_folders as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

create policy "Tenants can read their own files" on public.files as PERMISSIVE for SELECT to public
  using ((tenant_id IN ( SELECT tenants.id
   FROM tenants
  WHERE (tenants.auth_user_id = auth.uid()))));

create policy files_owner on public.files as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

create policy lease_templates_manager on public.lease_templates as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

create policy lease_templates_select_tenant on public.lease_templates as PERMISSIVE for SELECT to public
  using (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM leases l
  WHERE ((l.template_id = lease_templates.id) AND is_tenant_of(l.tenant_id))))));

create policy leases_manager on public.leases as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

create policy leases_select_tenant on public.leases as PERMISSIVE for SELECT to public
  using (((auth.uid() = user_id) OR is_tenant_of(tenant_id)));

create policy leases_update_tenant on public.leases as PERMISSIVE for UPDATE to public
  using (((auth.uid() = user_id) OR (is_tenant_of(tenant_id) AND (status = 'sent'::text))))
  with check (((auth.uid() = user_id) OR is_tenant_of(tenant_id)));

create policy "Users manage own maintenance_requests" on public.maintenance_requests as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id));

create policy tenant_insert_own_maintenance on public.maintenance_requests as PERMISSIVE for INSERT to public
  with check (is_tenant_of(tenant_id));

create policy tenant_select_own_maintenance on public.maintenance_requests as PERMISSIVE for SELECT to public
  using (is_tenant_of(tenant_id));

create policy messages_delete_own on public.messages as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));

create policy messages_insert_own on public.messages as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));

create policy messages_insert_tenant on public.messages as PERMISSIVE for INSERT to public
  with check (((auth.uid() = user_id) OR is_tenant_of(tenant_id)));

create policy messages_select_own on public.messages as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));

create policy messages_select_tenant on public.messages as PERMISSIVE for SELECT to public
  using (((auth.uid() = user_id) OR is_tenant_of(tenant_id)));

create policy messages_update_own on public.messages as PERMISSIVE for UPDATE to public
  using ((auth.uid() = user_id));

create policy messages_update_tenant on public.messages as PERMISSIVE for UPDATE to public
  using (((auth.uid() = user_id) OR is_tenant_of(tenant_id)));

create policy notifications_delete_own on public.notifications as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));

create policy notifications_insert_own on public.notifications as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));

create policy notifications_select_own on public.notifications as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));

create policy notifications_update_own on public.notifications as PERMISSIVE for UPDATE to public
  using ((auth.uid() = user_id));

create policy properties_delete_own on public.properties as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));

create policy properties_insert_own on public.properties as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));

create policy properties_select_own on public.properties as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));

create policy properties_select_tenant on public.properties as PERMISSIVE for SELECT to public
  using (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM tenants t
  WHERE ((t.property_id = properties.id) AND (t.auth_user_id = auth.uid()))))));

create policy properties_update_own on public.properties as PERMISSIVE for UPDATE to public
  using ((auth.uid() = user_id));

create policy "Users manage own property_owners" on public.property_owners as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id));

create policy rent_payments_delete_own on public.rent_payments as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));

create policy rent_payments_insert_own on public.rent_payments as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));

create policy rent_payments_select_own on public.rent_payments as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));

create policy rent_payments_select_tenant on public.rent_payments as PERMISSIVE for SELECT to public
  using (((auth.uid() = user_id) OR is_tenant_of(tenant_id)));

create policy rent_payments_update_own on public.rent_payments as PERMISSIVE for UPDATE to public
  using ((auth.uid() = user_id));

create policy rent_schedules_manager on public.rent_schedules as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

create policy rent_schedules_select_tenant on public.rent_schedules as PERMISSIVE for SELECT to public
  using (((auth.uid() = user_id) OR is_tenant_of(tenant_id)));

create policy "service role full access webhook events" on public.stripe_webhook_events as PERMISSIVE for ALL to public
  using ((auth.role() = 'service_role'::text))
  with check ((auth.role() = 'service_role'::text));

create policy tenant_invites_manager on public.tenant_invites as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

create policy tenants_delete_own on public.tenants as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));

create policy tenants_insert_own on public.tenants as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));

create policy tenants_select_own on public.tenants as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));

create policy tenants_select_self on public.tenants as PERMISSIVE for SELECT to public
  using (((auth.uid() = user_id) OR (auth.uid() = auth_user_id)));

create policy tenants_update_own on public.tenants as PERMISSIVE for UPDATE to public
  using ((auth.uid() = user_id));

create policy "Individuals can create todos." on public.todos as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));

create policy "Individuals can delete their own todos." on public.todos as PERMISSIVE for DELETE to public
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "Individuals can update their own todos." on public.todos as PERMISSIVE for UPDATE to public
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "Individuals can view their own todos. " on public.todos as PERMISSIVE for SELECT to public
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users can insert own profile" on public.user_profiles as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));

create policy "Users can select own profile" on public.user_profiles as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));

create policy "Users can update own profile" on public.user_profiles as PERMISSIVE for UPDATE to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

create policy vendor_payments_delete on public.vendor_payments as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));

create policy vendor_payments_insert on public.vendor_payments as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));

create policy vendor_payments_select on public.vendor_payments as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));

create policy vendor_payments_update on public.vendor_payments as PERMISSIVE for UPDATE to public
  using ((auth.uid() = user_id));

create policy vendors_delete on public.vendors as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));

create policy vendors_insert on public.vendors as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));

create policy vendors_select on public.vendors as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));

create policy vendors_update on public.vendors as PERMISSIVE for UPDATE to public
  using ((auth.uid() = user_id));

-- ---------------------------------------------------------------------------
-- Storage: private bucket for property/tenant files (50 MB per file)
-- Objects are stored under "<auth user id>/..." and each user can only reach
-- their own folder.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-files', 'property-files', false, 52428800, null)
on conflict (id) do nothing;

create policy property_files_delete on storage.objects as PERMISSIVE for DELETE to public
  using (((bucket_id = 'property-files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

create policy property_files_insert on storage.objects as PERMISSIVE for INSERT to public
  with check (((bucket_id = 'property-files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

create policy property_files_select on storage.objects as PERMISSIVE for SELECT to public
  using (((bucket_id = 'property-files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

create policy property_files_update on storage.objects as PERMISSIVE for UPDATE to public
  using (((bucket_id = 'property-files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

-- ---------------------------------------------------------------------------
-- Scheduled job (pg_cron) — recorded for completeness, intentionally NOT run.
--
-- The live database has this job, but it cannot work there: it calls
-- net.http_post (pg_net is not installed) and reads vault secrets
-- 'project_url' and 'edge_invoke_key' that do not exist. Monthly rent is
-- generated by the Vercel cron /api/cron/generate-invoices instead (see
-- vercel.json). Kept here so the deployed state is fully documented.
-- See supabase/README.md "Known issues".
-- ---------------------------------------------------------------------------
-- select cron.schedule('process-monthly-rent-day-1', '0 0 1 * *', $$
--   select net.http_post(
--     url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/process-monthly-rent',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'edge_invoke_key'),
--       'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_invoke_key')
--     ),
--     body := '{}'::jsonb,
--     timeout_milliseconds := 10000
--   );
-- $$);
