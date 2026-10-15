-- =============================================================================
-- Security/performance cleanup from the Supabase advisors
-- =============================================================================

-- Lint 0011: pin search_path so the trigger can't be redirected to a
-- look-alike now() in another schema. now() lives in pg_catalog, which is
-- always searched, so behavior is unchanged.
alter function public.set_updated_at() set search_path = '';

-- Unindexed foreign keys on maintenance_requests. The triage agent looks
-- requests up by tenant and account, and the dashboard by property.
create index if not exists idx_maintenance_requests_tenant_id on public.maintenance_requests (tenant_id);
create index if not exists idx_maintenance_requests_property_id on public.maintenance_requests (property_id);
create index if not exists idx_maintenance_requests_user_id on public.maintenance_requests (user_id);
