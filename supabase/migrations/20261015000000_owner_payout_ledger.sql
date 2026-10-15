-- Owner payout audit ledger. Records externally completed transfers only; never initiates money movement.
alter table public.property_owners add constraint property_owners_id_user_unique unique (id, user_id);
alter table public.properties add constraint properties_owner_same_manager_fk foreign key (owner_id, user_id) references public.property_owners(id, user_id);
create table if not exists public.owner_payouts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 owner_id uuid not null,
 amount numeric(12,2) not null check (amount > 0),
 payout_date date not null,
 payment_method text not null check (length(payment_method) between 1 and 80),
 reference_number text,
 notes text,
 created_at timestamptz not null default now(),
 constraint owner_payouts_owner_user_fk foreign key (owner_id,user_id) references public.property_owners(id,user_id) on delete restrict
);
create index if not exists owner_payouts_user_owner_date_idx on public.owner_payouts(user_id, owner_id, payout_date desc);
alter table public.owner_payouts enable row level security;
create policy "owner_payouts_select_own" on public.owner_payouts for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner_payouts_insert_own" on public.owner_payouts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owner_payouts_update_own" on public.owner_payouts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "owner_payouts_delete_own" on public.owner_payouts for delete to authenticated using ((select auth.uid()) = user_id);
grant select,insert,update,delete on public.owner_payouts to authenticated;
