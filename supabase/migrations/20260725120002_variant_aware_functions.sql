-- Market Register: make complete_sale / void_transaction / adjust_inventory
-- variant-aware. Simple items (has_variants = false) behave exactly as
-- before; items with variants require a variant_id and operate on that
-- variant's own quantity instead of the parent item's.

create or replace function public.adjust_inventory(
  p_item_id uuid,
  p_adjustment_type text,
  p_note text default null,
  p_delta integer default null,
  p_set_to integer default null,
  p_variant_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_has_variants boolean;
  v_previous_quantity integer;
  v_new_quantity integer;
  v_delta integer;
  v_adjustment_id uuid;
  v_variant_label text;
  v_variant_item_id uuid;
begin
  select business_id, quantity, has_variants into v_business_id, v_previous_quantity, v_has_variants
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

  if v_has_variants then
    if p_variant_id is null then
      raise exception 'Select which variant to adjust.';
    end if;

    select item_id, quantity, value into v_variant_item_id, v_previous_quantity, v_variant_label
    from public.inventory_item_variants
    where id = p_variant_id
    for update;

    if v_variant_item_id is null or v_variant_item_id <> p_item_id then
      raise exception 'That variant does not belong to this item.';
    end if;
  elsif p_variant_id is not null then
    raise exception 'This item does not have variants.';
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

  if v_has_variants then
    update public.inventory_item_variants
    set quantity = v_new_quantity, updated_by = auth.uid()
    where id = p_variant_id;
  else
    update public.inventory_items
    set quantity = v_new_quantity, updated_by = auth.uid()
    where id = p_item_id;
  end if;

  insert into public.inventory_adjustments (
    business_id, inventory_item_id, variant_id, variant_label, adjustment_type,
    previous_quantity, quantity_change, new_quantity, note, employee_id
  ) values (
    v_business_id, p_item_id, p_variant_id, v_variant_label, p_adjustment_type,
    v_previous_quantity, v_delta, v_new_quantity, nullif(trim(coalesce(p_note, '')), ''), auth.uid()
  ) returning id into v_adjustment_id;

  insert into public.activity_logs (business_id, actor_id, action_type, entity_type, entity_id, metadata)
  values (
    v_business_id, auth.uid(), 'inventory_adjusted', 'inventory_item', p_item_id,
    jsonb_build_object('adjustment_type', p_adjustment_type, 'delta', v_delta, 'new_quantity', v_new_quantity, 'variant', v_variant_label)
  );

  return v_adjustment_id;
end;
$$;

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
  v_has_variants boolean;
  v_variant_item_id uuid;
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
    select * from jsonb_to_recordset(p_items) as x(inventory_item_id uuid, variant_id uuid, quantity integer)
  loop
    if v_item.inventory_item_id is null or v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Each sale line must reference an item with a positive quantity.';
    end if;

    select business_id, status, quantity, price, cost, name, category, color, has_variants
      into v_item_business_id, v_item_status, v_current_qty, v_current_price, v_current_cost, v_item_name, v_item_category, v_item_color, v_has_variants
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

    if v_has_variants then
      if v_item.variant_id is null then
        raise exception 'Select a variant for %.', v_item_name;
      end if;

      select item_id, quantity, value into v_variant_item_id, v_current_qty, v_item_color
      from public.inventory_item_variants
      where id = v_item.variant_id
      for update;

      if v_variant_item_id is null or v_variant_item_id <> v_item.inventory_item_id then
        raise exception 'That variant does not belong to %.', v_item_name;
      end if;
    end if;

    if not v_allow_negative and v_current_qty < v_item.quantity then
      raise exception 'Not enough stock for %: % available, % requested.', v_item_name, v_current_qty, v_item.quantity;
    end if;

    v_line_total := v_current_price * v_item.quantity;
    v_subtotal := v_subtotal + v_line_total;

    if v_has_variants then
      update public.inventory_item_variants
      set quantity = quantity - v_item.quantity
      where id = v_item.variant_id;
    else
      update public.inventory_items
      set quantity = quantity - v_item.quantity
      where id = v_item.inventory_item_id;
    end if;

    insert into public.transaction_items (
      transaction_id, inventory_item_id, variant_id, item_name, item_type, color, quantity, unit_price, unit_cost, line_total
    ) values (
      v_transaction_id, v_item.inventory_item_id, v_item.variant_id, v_item_name, v_item_category, v_item_color, v_item.quantity, v_current_price, v_current_cost, v_line_total
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
    select inventory_item_id, variant_id, quantity from public.transaction_items where transaction_id = p_transaction_id
  loop
    if v_item.variant_id is not null then
      update public.inventory_item_variants
      set quantity = quantity + v_item.quantity
      where id = v_item.variant_id;
    elsif v_item.inventory_item_id is not null then
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
