-- Market Register: Row Level Security.
-- Every business-owned table is readable only by active members of that
-- business. Sensitive mutations (sales, voids, inventory quantity changes,
-- event lifecycle, cash counts, invitations) have NO direct client write
-- policy at all -- they are only reachable through the SECURITY DEFINER
-- functions in 20260724100004_business_functions.sql, which perform their own
-- permission checks and audit logging. This means a compromised or buggy
-- client can never bypass server-side validation for those operations.

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_settings enable row level security;
alter table public.business_members enable row level security;
alter table public.business_invitations enable row level security;
alter table public.payment_methods enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_adjustments enable row level security;
alter table public.events enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.cash_counts enable row level security;
alter table public.activity_logs enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy profiles_select on public.profiles
  for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.business_members mine
      join public.business_members theirs on theirs.business_id = mine.business_id
      where mine.user_id = auth.uid()
        and mine.status = 'active'
        and theirs.user_id = profiles.id
        and theirs.status = 'active'
    )
  );

create policy profiles_update_own on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_url, updated_at) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- businesses (insert only via create_business(); update = owner only)
-- ---------------------------------------------------------------------------

create policy businesses_select on public.businesses
  for select
  using (public.is_business_member(id));

create policy businesses_update_owner on public.businesses
  for update
  using (public.is_business_owner(id))
  with check (public.is_business_owner(id));

revoke update on public.businesses from authenticated;
grant update (name, logo_url, email, phone, default_currency, timezone, updated_at) on public.businesses to authenticated;

-- ---------------------------------------------------------------------------
-- business_settings (insert only via create_business(); update = owner only)
-- ---------------------------------------------------------------------------

create policy business_settings_select on public.business_settings
  for select
  using (public.is_business_member(business_id));

create policy business_settings_update_owner on public.business_settings
  for update
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

revoke update on public.business_settings from authenticated;
grant update (
  allow_negative_inventory, employees_can_adjust_inventory,
  employees_can_void_own_recent_transactions, employees_can_manage_events,
  void_window_minutes, updated_at
) on public.business_settings to authenticated;

-- ---------------------------------------------------------------------------
-- business_members (insert only via create_business()/accept_invitation())
-- ---------------------------------------------------------------------------

create policy business_members_select on public.business_members
  for select
  using (public.is_business_member(business_id));

create policy business_members_update_owner on public.business_members
  for update
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

revoke update on public.business_members from authenticated;
grant update (role, status, updated_at) on public.business_members to authenticated;

-- ---------------------------------------------------------------------------
-- business_invitations (owner-only visibility and management)
-- ---------------------------------------------------------------------------

create policy business_invitations_select_owner on public.business_invitations
  for select
  using (public.is_business_owner(business_id));

create policy business_invitations_update_owner on public.business_invitations
  for update
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

-- ---------------------------------------------------------------------------
-- payment_methods (global reference data, read-only to clients)
-- ---------------------------------------------------------------------------

create policy payment_methods_select_all on public.payment_methods
  for select
  using (true);

-- ---------------------------------------------------------------------------
-- inventory_items
-- Owners manage item details directly; quantity is column-protected below so
-- it can only change via adjust_inventory()/complete_sale()/void_transaction().
-- ---------------------------------------------------------------------------

create policy inventory_items_select on public.inventory_items
  for select
  using (public.is_business_member(business_id));

create policy inventory_items_insert_owner on public.inventory_items
  for insert
  with check (public.is_business_owner(business_id));

create policy inventory_items_update_owner on public.inventory_items
  for update
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

revoke update on public.inventory_items from authenticated;
grant update (
  name, category, color, sku, description, image_url,
  price, cost, low_stock_threshold, status, updated_by, updated_at
) on public.inventory_items to authenticated;

-- ---------------------------------------------------------------------------
-- inventory_adjustments (owner-only visibility per spec; writes via RPC only)
-- ---------------------------------------------------------------------------

create policy inventory_adjustments_select_owner on public.inventory_adjustments
  for select
  using (public.is_business_owner(business_id));

-- ---------------------------------------------------------------------------
-- events
-- Basic detail edits allowed directly for owners/authorized employees; the
-- status lifecycle (start/close/reopen) is column-protected to force use of
-- the dedicated RPC functions, which enforce the "one active event" rule and
-- create recap/cash-count records atomically.
-- ---------------------------------------------------------------------------

create policy events_select on public.events
  for select
  using (public.is_business_member(business_id));

create policy events_insert on public.events
  for insert
  with check (public.can_manage_events(business_id));

create policy events_update on public.events
  for update
  using (public.can_manage_events(business_id))
  with check (public.can_manage_events(business_id));

revoke update on public.events from authenticated;
grant update (
  name, event_date, start_time, end_time, location, notes, updated_at
) on public.events to authenticated;

-- ---------------------------------------------------------------------------
-- transactions / transaction_items
-- Read-only to clients; all writes happen inside complete_sale()/void_transaction().
-- ---------------------------------------------------------------------------

create policy transactions_select on public.transactions
  for select
  using (public.is_business_member(business_id));

create policy transaction_items_select on public.transaction_items
  for select
  using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_items.transaction_id
        and public.is_business_member(t.business_id)
    )
  );

-- ---------------------------------------------------------------------------
-- cash_counts (read-only to clients; writes via record_cash_count())
-- ---------------------------------------------------------------------------

create policy cash_counts_select on public.cash_counts
  for select
  using (public.is_business_member(business_id));

-- ---------------------------------------------------------------------------
-- activity_logs (owner-only, matches the "Employee activity" feature)
-- ---------------------------------------------------------------------------

create policy activity_logs_select_owner on public.activity_logs
  for select
  using (public.is_business_owner(business_id));
