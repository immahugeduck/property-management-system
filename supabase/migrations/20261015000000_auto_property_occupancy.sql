-- =============================================================================
-- Keep properties.status in step with tenant assignments
--
-- The app only marked a property occupied when a tenant was *created* with
-- it, so assigning a property by editing a tenant, moving a tenant, marking
-- them inactive, or deleting them left the vacant/occupied badge wrong.
-- This trigger recomputes occupancy whenever a tenant's property or status
-- changes, from every path (dashboard, portal, service role).
--
-- Rules:
--   at least one active tenant          -> 'occupied'
--   no active tenants, was 'occupied'   -> 'vacant'
--   no active tenants, 'maintenance'    -> left as 'maintenance'
-- =============================================================================

create or replace function public.sync_property_occupancy(p_property_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_property_id is null then
    return;
  end if;

  if exists (
    select 1 from public.tenants t
    where t.property_id = p_property_id and t.status = 'active'
  ) then
    update public.properties
      set status = 'occupied', updated_at = now()
      where id = p_property_id and status is distinct from 'occupied';
  else
    update public.properties
      set status = 'vacant', updated_at = now()
      where id = p_property_id and status = 'occupied';
  end if;
end;
$$;

create or replace function public.tenants_sync_property_occupancy()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.sync_property_occupancy(new.property_id);
  end if;
  if tg_op = 'DELETE'
     or (tg_op = 'UPDATE' and old.property_id is distinct from new.property_id) then
    perform public.sync_property_occupancy(old.property_id);
  end if;
  return null;
end;
$$;

drop trigger if exists tenants_sync_property_occupancy on public.tenants;
create trigger tenants_sync_property_occupancy
  after insert or delete or update of property_id, status on public.tenants
  for each row execute function public.tenants_sync_property_occupancy();

-- Runs with the caller's rights (RLS still applies), so signed-in managers
-- must keep EXECUTE for the trigger's nested call. Anonymous users never
-- change tenants, so they don't need it.
revoke execute on function public.sync_property_occupancy(uuid) from public, anon;
grant execute on function public.sync_property_occupancy(uuid) to authenticated, service_role;

-- Fix existing rows that are already out of step.
select public.sync_property_occupancy(p.id) from public.properties p;
