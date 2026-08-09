-- Market Register: per-variant pricing.
-- Variants can now be sold at different prices (e.g. MiniBits: Small Bag $15,
-- Large Bag $25) instead of always inheriting the parent item's price. Cost
-- stays shared at the item level -- only price varies per variant, since
-- that's the actual business need.

alter table public.inventory_item_variants
  add column price numeric(10, 2) not null default 0;

-- Backfill any variants created before this column existed with their
-- parent item's price rather than leaving them at 0.
update public.inventory_item_variants v
set price = i.price
from public.inventory_items i
where i.id = v.item_id;

-- Price is a normal owner-editable field (like value), not RPC-protected
-- like quantity.
revoke update on public.inventory_item_variants from authenticated;
grant update (value, price, updated_by, updated_at) on public.inventory_item_variants to authenticated;

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

      select item_id, quantity, value, price into v_variant_item_id, v_current_qty, v_item_color, v_current_price
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
