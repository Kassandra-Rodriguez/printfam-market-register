-- Market Register: business-logic functions.
-- These are the only sanctioned write paths for sensitive, multi-table, or
-- money/inventory-affecting operations. Each function re-checks permissions
-- itself (never trusting RLS alone) and writes an activity_logs row. Because
-- a plpgsql function body executes as a single statement from the caller's
-- point of view, any RAISE EXCEPTION rolls back everything the function did,
-- giving atomic all-or-nothing behavior for sales and voids.

-- ---------------------------------------------------------------------------
-- create_business: onboarding wizard entry point
-- ---------------------------------------------------------------------------

create or replace function public.create_business(
  p_name text,
  p_owner_name text,
  p_email text,
  p_phone text default null,
  p_default_currency text default 'USD',
  p_timezone text default 'America/New_York',
  p_logo_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a business.';
  end if;

  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Business name is required.';
  end if;

  if exists (select 1 from public.business_members where user_id = auth.uid() and status = 'active') then
    raise exception 'You already belong to a business.';
  end if;

  insert into public.businesses (name, logo_url, owner_id, email, phone, default_currency, timezone)
  values (trim(p_name), p_logo_url, auth.uid(), p_email, p_phone, coalesce(p_default_currency, 'USD'), coalesce(p_timezone, 'America/New_York'))
  returning id into v_business_id;

  insert into public.business_settings (business_id) values (v_business_id);

  insert into public.business_members (business_id, user_id, role, status, invited_by)
  values (v_business_id, auth.uid(), 'owner', 'active', auth.uid());

  if trim(coalesce(p_owner_name, '')) <> '' then
    update public.profiles set full_name = trim(p_owner_name) where id = auth.uid();
  end if;

  insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
  values (v_business_id, auth.uid(), 'business_created', 'business', v_business_id, jsonb_build_object('name', trim(p_name)));

  return v_business_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- invite_employee / get_invitation_preview / accept_invitation
-- ---------------------------------------------------------------------------

create or replace function public.invite_employee(p_business_id uuid, p_email text)
returns table (invitation_id uuid, token text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_raw_token text;
  v_token_hash text;
  v_invitation_id uuid;
  v_email text := lower(trim(p_email));
begin
  if not public.is_business_owner(p_business_id) then
    raise exception 'Only the business owner can invite employees.';
  end if;

  if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address.';
  end if;

  if exists (
    select 1
    from public.business_members bm
    join public.profiles p on p.id = bm.user_id
    where bm.business_id = p_business_id and bm.status = 'active' and lower(p.email) = v_email
  ) then
    raise exception 'This email already belongs to a member of your business.';
  end if;

  update public.business_invitations
  set status = 'revoked'
  where business_id = p_business_id and lower(email) = v_email and status = 'pending';

  v_raw_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');

  insert into public.business_invitations (business_id, email, role, token_hash, invited_by, expires_at)
  values (p_business_id, v_email, 'employee', v_token_hash, auth.uid(), now() + interval '7 days')
  returning id into v_invitation_id;

  insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
  values (p_business_id, auth.uid(), 'employee_invited', 'business_invitation', v_invitation_id, jsonb_build_object('email', v_email));

  return query select v_invitation_id, v_raw_token;
end;
$$;

create or replace function public.get_invitation_preview(p_token text)
returns table (
  business_id uuid,
  business_name text,
  email text,
  role text,
  status text,
  expires_at timestamptz
)
language sql
security definer
stable
set search_path = public, extensions
as $$
  select bi.business_id, b.name, bi.email, bi.role, bi.status, bi.expires_at
  from public.business_invitations bi
  join public.businesses b on b.id = bi.business_id
  where bi.token_hash = encode(digest(p_token, 'sha256'), 'hex');
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_invitation record;
  v_user_email text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to accept this invitation.';
  end if;

  select * into v_invitation
  from public.business_invitations
  where token_hash = encode(digest(p_token, 'sha256'), 'hex');

  if v_invitation.id is null then
    raise exception 'This invitation link is invalid.';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'This invitation has already been used or is no longer valid.';
  end if;

  if v_invitation.expires_at < now() then
    update public.business_invitations set status = 'expired' where id = v_invitation.id;
    raise exception 'This invitation has expired. Ask the business owner to send a new one.';
  end if;

  select email into v_user_email from auth.users where id = auth.uid();

  if lower(v_user_email) <> lower(v_invitation.email) then
    raise exception 'This invitation was sent to %. Sign in with that email address to accept it.', v_invitation.email;
  end if;

  if exists (select 1 from public.business_members where user_id = auth.uid() and status = 'active') then
    raise exception 'You already belong to a business.';
  end if;

  insert into public.business_members (business_id, user_id, role, status, invited_by)
  values (v_invitation.business_id, auth.uid(), v_invitation.role, 'active', v_invitation.invited_by)
  on conflict (business_id, user_id) do update set status = 'active', role = excluded.role;

  update public.business_invitations
  set status = 'accepted', accepted_at = now()
  where id = v_invitation.id;

  insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
  values (v_invitation.business_id, auth.uid(), 'employee_joined', 'business_member', auth.uid(), jsonb_build_object('email', v_invitation.email));

  return v_invitation.business_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- adjust_inventory
-- ---------------------------------------------------------------------------

create or replace function public.adjust_inventory(
  p_item_id uuid,
  p_adjustment_type text,
  p_note text default null,
  p_delta integer default null,
  p_set_to integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_previous_quantity integer;
  v_new_quantity integer;
  v_delta integer;
  v_adjustment_id uuid;
begin
  select business_id, quantity into v_business_id, v_previous_quantity
  from public.inventory_items
  where id = p_item_id
  for update;

  if v_business_id is null then
    raise exception 'Inventory item not found.';
  end if;

  if not public.can_adjust_inventory(v_business_id) then
    raise exception 'You do not have permission to adjust inventory.';
  end if;

  if p_adjustment_type not in ('stock_added', 'manual_correction', 'damaged', 'lost', 'returned', 'other') then
    raise exception 'Unknown adjustment type.';
  end if;

  if p_adjustment_type in ('damaged', 'lost', 'other') and trim(coalesce(p_note, '')) = '' then
    raise exception 'A note is required for this adjustment type.';
  end if;

  if p_set_to is not null then
    v_new_quantity := p_set_to;
    v_delta := p_set_to - v_previous_quantity;
  elsif p_delta is not null then
    v_delta := p_delta;
    v_new_quantity := v_previous_quantity + p_delta;
  else
    raise exception 'Provide either a quantity change or a target quantity.';
  end if;

  if v_new_quantity < 0 then
    raise exception 'The resulting quantity cannot be negative (currently %, requested change %).', v_previous_quantity, v_delta;
  end if;

  perform set_config('app.suppress_item_log', 'true', true);

  update public.inventory_items
  set quantity = v_new_quantity, updated_by = auth.uid()
  where id = p_item_id;

  insert into public.inventory_adjustments (
    business_id, inventory_item_id, adjustment_type, previous_quantity, quantity_change, new_quantity, note, employee_id
  ) values (
    v_business_id, p_item_id, p_adjustment_type, v_previous_quantity, v_delta, v_new_quantity, nullif(trim(coalesce(p_note, '')), ''), auth.uid()
  ) returning id into v_adjustment_id;

  insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
  values (
    v_business_id, auth.uid(), 'inventory_adjusted', 'inventory_item', p_item_id,
    jsonb_build_object('adjustment_type', p_adjustment_type, 'delta', v_delta, 'new_quantity', v_new_quantity)
  );

  return v_adjustment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- complete_sale
-- ---------------------------------------------------------------------------

create or replace function public.complete_sale(
  p_event_id uuid,
  p_payment_method_code text,
  p_items jsonb,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_event_status text;
  v_payment_method_id uuid;
  v_allow_negative boolean;
  v_transaction_id uuid;
  v_subtotal numeric(10, 2) := 0;
  v_line_total numeric(10, 2);
  v_item record;
  v_current_qty integer;
  v_current_price numeric(10, 2);
  v_current_cost numeric(10, 2);
  v_item_name text;
  v_item_category text;
  v_item_color text;
  v_item_business_id uuid;
  v_item_status text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to record a sale.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A sale must include at least one item.';
  end if;

  select business_id, status into v_business_id, v_event_status
  from public.events
  where id = p_event_id;

  if v_business_id is null then
    raise exception 'Event not found.';
  end if;

  if not public.is_business_member(v_business_id) then
    raise exception 'You are not a member of this business.';
  end if;

  if v_event_status <> 'active' then
    raise exception 'Sales can only be recorded against an active event.';
  end if;

  select id into v_payment_method_id
  from public.payment_methods
  where code = p_payment_method_code and is_active = true;

  if v_payment_method_id is null then
    raise exception 'Invalid or inactive payment method.';
  end if;

  select coalesce(allow_negative_inventory, false) into v_allow_negative
  from public.business_settings
  where business_id = v_business_id;

  insert into public.transactions (business_id, event_id, employee_id, payment_method_id, subtotal, total, note, status)
  values (v_business_id, p_event_id, auth.uid(), v_payment_method_id, 0, 0, nullif(trim(coalesce(p_note, '')), ''), 'completed')
  returning id into v_transaction_id;

  perform set_config('app.suppress_item_log', 'true', true);

  for v_item in
    select * from jsonb_to_recordset(p_items) as x(inventory_item_id uuid, quantity integer)
  loop
    if v_item.inventory_item_id is null or v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Each sale line must reference an item with a positive quantity.';
    end if;

    select business_id, status, quantity, price, cost, name, category, color
      into v_item_business_id, v_item_status, v_current_qty, v_current_price, v_current_cost, v_item_name, v_item_category, v_item_color
    from public.inventory_items
    where id = v_item.inventory_item_id
    for update;

    if v_item_business_id is null then
      raise exception 'One of the items in this sale no longer exists.';
    end if;

    if v_item_business_id <> v_business_id then
      raise exception 'One of the items in this sale does not belong to this business.';
    end if;

    if v_item_status <> 'active' then
      raise exception '% is no longer available for sale.', v_item_name;
    end if;

    if not v_allow_negative and v_current_qty < v_item.quantity then
      raise exception 'Not enough stock for %: % available, % requested.', v_item_name, v_current_qty, v_item.quantity;
    end if;

    v_line_total := v_current_price * v_item.quantity;
    v_subtotal := v_subtotal + v_line_total;

    update public.inventory_items
    set quantity = quantity - v_item.quantity
    where id = v_item.inventory_item_id;

    insert into public.transaction_items (
      transaction_id, inventory_item_id, item_name, item_type, color, quantity, unit_price, unit_cost, line_total
    ) values (
      v_transaction_id, v_item.inventory_item_id, v_item_name, v_item_category, v_item_color, v_item.quantity, v_current_price, v_current_cost, v_line_total
    );
  end loop;

  update public.transactions
  set subtotal = v_subtotal, total = v_subtotal
  where id = v_transaction_id;

  insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
  values (v_business_id, auth.uid(), 'sale_completed', 'transaction', v_transaction_id, jsonb_build_object('total', v_subtotal, 'payment_method', p_payment_method_code));

  return v_transaction_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- void_transaction
-- ---------------------------------------------------------------------------

create or replace function public.void_transaction(p_transaction_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_status text;
  v_item record;
begin
  if not public.can_void_transaction(p_transaction_id) then
    raise exception 'You do not have permission to void this transaction.';
  end if;

  if trim(coalesce(p_reason, '')) = '' then
    raise exception 'A reason is required to void a transaction.';
  end if;

  select business_id, status into v_business_id, v_status
  from public.transactions
  where id = p_transaction_id
  for update;

  if v_business_id is null then
    raise exception 'Transaction not found.';
  end if;

  if v_status = 'voided' then
    raise exception 'This transaction has already been voided.';
  end if;

  perform set_config('app.suppress_item_log', 'true', true);

  for v_item in
    select inventory_item_id, quantity from public.transaction_items where transaction_id = p_transaction_id
  loop
    if v_item.inventory_item_id is not null then
      update public.inventory_items
      set quantity = quantity + v_item.quantity
      where id = v_item.inventory_item_id;
    end if;
  end loop;

  update public.transactions
  set status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = trim(p_reason)
  where id = p_transaction_id;

  insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
  values (v_business_id, auth.uid(), 'sale_voided', 'transaction', p_transaction_id, jsonb_build_object('reason', trim(p_reason)));

  return p_transaction_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- event lifecycle: start / close / reopen
-- ---------------------------------------------------------------------------

create or replace function public.start_event(p_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_status text;
begin
  select business_id, status into v_business_id, v_status
  from public.events
  where id = p_event_id
  for update;

  if v_business_id is null then
    raise exception 'Event not found.';
  end if;

  if not public.can_manage_events(v_business_id) then
    raise exception 'You do not have permission to manage events.';
  end if;

  if v_status <> 'upcoming' then
    raise exception 'Only an upcoming event can be started.';
  end if;

  if exists (select 1 from public.events where business_id = v_business_id and status = 'active') then
    raise exception 'Another event is already active. Close it before starting a new one.';
  end if;

  update public.events set status = 'active' where id = p_event_id;

  insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
  values (v_business_id, auth.uid(), 'event_started', 'event', p_event_id, '{}'::jsonb);

  return p_event_id;
end;
$$;

create or replace function public.close_event(
  p_event_id uuid,
  p_actual_cash numeric default null,
  p_starting_cash numeric default 0,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_status text;
begin
  select business_id, status into v_business_id, v_status
  from public.events
  where id = p_event_id
  for update;

  if v_business_id is null then
    raise exception 'Event not found.';
  end if;

  if not public.can_manage_events(v_business_id) then
    raise exception 'You do not have permission to manage events.';
  end if;

  if v_status <> 'active' then
    raise exception 'Only an active event can be closed.';
  end if;

  update public.events set status = 'closed', closed_at = now() where id = p_event_id;

  insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
  values (v_business_id, auth.uid(), 'event_closed', 'event', p_event_id, '{}'::jsonb);

  if p_actual_cash is not null then
    perform public.record_cash_count(p_event_id, p_actual_cash, coalesce(p_starting_cash, 0), p_note);
  end if;

  return p_event_id;
end;
$$;

create or replace function public.reopen_event(p_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_status text;
begin
  select business_id, status into v_business_id, v_status
  from public.events
  where id = p_event_id
  for update;

  if v_business_id is null then
    raise exception 'Event not found.';
  end if;

  if not public.can_manage_events(v_business_id) then
    raise exception 'You do not have permission to manage events.';
  end if;

  if v_status <> 'closed' then
    raise exception 'Only a closed event can be reopened.';
  end if;

  if exists (select 1 from public.events where business_id = v_business_id and status = 'active') then
    raise exception 'Another event is already active. Close it before reopening this one.';
  end if;

  update public.events set status = 'active', closed_at = null where id = p_event_id;

  insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
  values (v_business_id, auth.uid(), 'event_reopened', 'event', p_event_id, '{}'::jsonb);

  return p_event_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_cash_count
-- ---------------------------------------------------------------------------

create or replace function public.record_cash_count(
  p_event_id uuid,
  p_actual_cash numeric,
  p_starting_cash numeric default 0,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_recorded_cash_sales numeric(10, 2);
  v_expected numeric(10, 2);
  v_difference numeric(10, 2);
  v_cash_count_id uuid;
begin
  select business_id into v_business_id from public.events where id = p_event_id;

  if v_business_id is null then
    raise exception 'Event not found.';
  end if;

  if not public.is_business_member(v_business_id) then
    raise exception 'You are not a member of this business.';
  end if;

  if p_actual_cash is null or p_actual_cash < 0 then
    raise exception 'Enter the actual cash counted.';
  end if;

  select coalesce(sum(t.total), 0) into v_recorded_cash_sales
  from public.transactions t
  join public.payment_methods pm on pm.id = t.payment_method_id
  where t.event_id = p_event_id and t.status = 'completed' and pm.code = 'cash';

  v_expected := coalesce(p_starting_cash, 0) + v_recorded_cash_sales;
  v_difference := p_actual_cash - v_expected;

  insert into public.cash_counts (
    business_id, event_id, starting_cash, recorded_cash_sales, expected_cash, actual_cash, difference, note, employee_id
  ) values (
    v_business_id, p_event_id, coalesce(p_starting_cash, 0), v_recorded_cash_sales, v_expected, p_actual_cash, v_difference, nullif(trim(coalesce(p_note, '')), ''), auth.uid()
  ) returning id into v_cash_count_id;

  insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
  values (v_business_id, auth.uid(), 'cash_count_recorded', 'cash_count', v_cash_count_id, jsonb_build_object('difference', v_difference));

  return v_cash_count_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Activity-log triggers for direct (non-RPC) table writes
-- ---------------------------------------------------------------------------

create or replace function public.log_inventory_item_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('app.suppress_item_log', true), '') = 'true' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
    values (new.business_id, auth.uid(), 'item_created', 'inventory_item', new.id, jsonb_build_object('name', new.name));
  elsif tg_op = 'UPDATE' then
    if old.status = 'active' and new.status = 'archived' then
      insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
      values (new.business_id, auth.uid(), 'item_archived', 'inventory_item', new.id, jsonb_build_object('name', new.name));
    else
      insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
      values (new.business_id, auth.uid(), 'item_updated', 'inventory_item', new.id, jsonb_build_object('name', new.name));
    end if;
  end if;
  return new;
end;
$$;

create trigger inventory_items_log_changes
  after insert or update on public.inventory_items
  for each row execute function public.log_inventory_item_change();

create or replace function public.log_event_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
  values (new.business_id, auth.uid(), 'event_created', 'event', new.id, jsonb_build_object('name', new.name));
  return new;
end;
$$;

create trigger events_log_created
  after insert on public.events
  for each row execute function public.log_event_created();

create or replace function public.log_business_member_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'active' and new.status = 'removed' then
    insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
    values (new.business_id, auth.uid(), 'employee_removed', 'business_member', new.id, '{}'::jsonb);
  elsif old.role <> new.role then
    insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
    values (new.business_id, auth.uid(), 'employee_role_changed', 'business_member', new.id, jsonb_build_object('role', new.role));
  end if;
  return new;
end;
$$;

create trigger business_members_log_changes
  after update on public.business_members
  for each row execute function public.log_business_member_change();
