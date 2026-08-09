-- Market Register: permission helper functions.
-- These are SECURITY DEFINER but only ever read business_members rows scoped to
-- auth.uid(), so they cannot leak another user's membership data. They exist to
-- avoid recursive RLS policies on business_members itself and to centralize
-- permission rules reused by both RLS policies and business-logic RPCs.

create or replace function public.is_business_member(p_business_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
      and bm.status = 'active'
  );
$$;

create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
      and bm.status = 'active'
      and bm.role = 'owner'
  );
$$;

create or replace function public.current_member_role(p_business_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select bm.role
  from public.business_members bm
  where bm.business_id = p_business_id
    and bm.user_id = auth.uid()
    and bm.status = 'active'
  limit 1;
$$;

create or replace function public.can_adjust_inventory(p_business_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_business_owner(p_business_id)
    or (
      public.is_business_member(p_business_id)
      and exists (
        select 1
        from public.business_settings bs
        where bs.business_id = p_business_id
          and bs.employees_can_adjust_inventory = true
      )
    );
$$;

create or replace function public.can_manage_events(p_business_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_business_owner(p_business_id)
    or (
      public.is_business_member(p_business_id)
      and exists (
        select 1
        from public.business_settings bs
        where bs.business_id = p_business_id
          and bs.employees_can_manage_events = true
      )
    );
$$;

-- Can this business member void the given transaction right now?
create or replace function public.can_void_transaction(p_transaction_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_business_id uuid;
  v_employee_id uuid;
  v_occurred_at timestamptz;
  v_settings record;
begin
  select business_id, employee_id, occurred_at
    into v_business_id, v_employee_id, v_occurred_at
  from public.transactions
  where id = p_transaction_id;

  if v_business_id is null then
    return false;
  end if;

  if public.is_business_owner(v_business_id) then
    return true;
  end if;

  if not public.is_business_member(v_business_id) then
    return false;
  end if;

  select * into v_settings
  from public.business_settings
  where business_id = v_business_id;

  if v_settings is null or v_settings.employees_can_void_own_recent_transactions = false then
    return false;
  end if;

  if v_employee_id <> auth.uid() then
    return false;
  end if;

  return now() <= v_occurred_at + make_interval(mins => v_settings.void_window_minutes);
end;
$$;
