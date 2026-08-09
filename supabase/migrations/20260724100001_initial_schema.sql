-- Market Register: initial schema
-- Tables, constraints, indexes, and generic triggers (updated_at, new-user profile sync).

-- Supabase-hosted projects (and the local CLI stack) install extensions into
-- the "extensions" schema by convention, not "public".
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync when a user changes their login email.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  logo_url text,
  owner_id uuid not null references public.profiles (id),
  email text not null,
  phone text,
  default_currency text not null default 'USD',
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- business_settings
-- ---------------------------------------------------------------------------

create table public.business_settings (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  allow_negative_inventory boolean not null default false,
  employees_can_adjust_inventory boolean not null default false,
  employees_can_void_own_recent_transactions boolean not null default false,
  employees_can_manage_events boolean not null default false,
  void_window_minutes integer not null default 60 check (void_window_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger business_settings_set_updated_at
  before update on public.business_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- business_members
-- ---------------------------------------------------------------------------

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'employee')),
  status text not null default 'active' check (status in ('active', 'removed')),
  invited_by uuid references public.profiles (id),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index business_members_business_id_idx on public.business_members (business_id);
create index business_members_user_id_idx on public.business_members (user_id);

create trigger business_members_set_updated_at
  before update on public.business_members
  for each row execute function public.set_updated_at();

-- An owner row can never be removed or demoted through a direct update.
create or replace function public.protect_owner_membership()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'owner' and (new.role <> 'owner' or new.status <> 'active') then
    raise exception 'The business owner membership cannot be changed or removed.';
  end if;
  return new;
end;
$$;

create trigger business_members_protect_owner
  before update on public.business_members
  for each row execute function public.protect_owner_membership();

-- ---------------------------------------------------------------------------
-- business_invitations
-- ---------------------------------------------------------------------------

create table public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'employee')),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references public.profiles (id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_invitations_business_id_idx on public.business_invitations (business_id);
create index business_invitations_email_idx on public.business_invitations (lower(email));

create trigger business_invitations_set_updated_at
  before update on public.business_invitations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- payment_methods (global reference data, extensible without a migration)
-- ---------------------------------------------------------------------------

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- inventory_items
-- ---------------------------------------------------------------------------

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  category text not null,
  color text not null default '',
  sku text,
  description text,
  image_url text,
  quantity integer not null default 0,
  cost numeric(10, 2) not null default 0 check (cost >= 0),
  price numeric(10, 2) not null default 0 check (price >= 0),
  low_stock_threshold integer check (low_stock_threshold is null or low_stock_threshold >= 0),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid not null references public.profiles (id),
  updated_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inventory_items_business_id_idx on public.inventory_items (business_id);
create index inventory_items_business_status_idx on public.inventory_items (business_id, status);
create index inventory_items_business_category_idx on public.inventory_items (business_id, category);
create index inventory_items_business_color_idx on public.inventory_items (business_id, color);

create trigger inventory_items_set_updated_at
  before update on public.inventory_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- inventory_adjustments
-- ---------------------------------------------------------------------------

create table public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items (id) on delete cascade,
  adjustment_type text not null check (
    adjustment_type in ('stock_added', 'manual_correction', 'damaged', 'lost', 'returned', 'other')
  ),
  previous_quantity integer not null,
  quantity_change integer not null,
  new_quantity integer not null,
  note text,
  employee_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint inventory_adjustments_note_required check (
    adjustment_type not in ('damaged', 'lost', 'other') or (note is not null and char_length(trim(note)) > 0)
  )
);

create index inventory_adjustments_business_id_idx on public.inventory_adjustments (business_id);
create index inventory_adjustments_item_id_idx on public.inventory_adjustments (inventory_item_id);

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  notes text,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'closed')),
  created_by uuid not null references public.profiles (id),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_business_id_idx on public.events (business_id);
create index events_business_status_idx on public.events (business_id, status);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  event_id uuid not null references public.events (id),
  employee_id uuid not null references public.profiles (id),
  occurred_at timestamptz not null default now(),
  payment_method_id uuid not null references public.payment_methods (id),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  total numeric(10, 2) not null check (total >= 0),
  note text,
  status text not null default 'completed' check (status in ('completed', 'voided')),
  voided_at timestamptz,
  voided_by uuid references public.profiles (id),
  void_reason text,
  created_at timestamptz not null default now(),
  constraint transactions_void_fields_consistent check (
    (status = 'completed' and voided_at is null and voided_by is null and void_reason is null)
    or
    (status = 'voided' and voided_at is not null and voided_by is not null and void_reason is not null)
  )
);

create index transactions_business_id_idx on public.transactions (business_id);
create index transactions_business_status_idx on public.transactions (business_id, status);
create index transactions_event_id_idx on public.transactions (event_id);
create index transactions_employee_id_idx on public.transactions (employee_id);
create index transactions_occurred_at_idx on public.transactions (occurred_at);

-- ---------------------------------------------------------------------------
-- transaction_items (immutable snapshots)
-- ---------------------------------------------------------------------------

create table public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  inventory_item_id uuid references public.inventory_items (id) on delete set null,
  item_name text not null,
  item_type text not null,
  color text not null default '',
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  unit_cost numeric(10, 2) not null check (unit_cost >= 0),
  line_total numeric(10, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index transaction_items_transaction_id_idx on public.transaction_items (transaction_id);
create index transaction_items_inventory_item_id_idx on public.transaction_items (inventory_item_id);

-- ---------------------------------------------------------------------------
-- cash_counts
-- ---------------------------------------------------------------------------

create table public.cash_counts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  event_id uuid not null references public.events (id),
  starting_cash numeric(10, 2) not null default 0 check (starting_cash >= 0),
  recorded_cash_sales numeric(10, 2) not null check (recorded_cash_sales >= 0),
  expected_cash numeric(10, 2) not null,
  actual_cash numeric(10, 2) not null check (actual_cash >= 0),
  difference numeric(10, 2) not null,
  note text,
  employee_id uuid not null references public.profiles (id),
  counted_at timestamptz not null default now()
);

create index cash_counts_business_id_idx on public.cash_counts (business_id);
create index cash_counts_event_id_idx on public.cash_counts (event_id);

-- ---------------------------------------------------------------------------
-- activity_logs
-- ---------------------------------------------------------------------------

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  actor_id uuid not null references public.profiles (id),
  action_type text not null check (
    action_type in (
      'business_created', 'business_updated',
      'employee_invited', 'employee_joined', 'employee_removed', 'employee_role_changed',
      'item_created', 'item_updated', 'item_archived',
      'inventory_adjusted',
      'event_created', 'event_started', 'event_closed', 'event_reopened',
      'sale_completed', 'sale_voided',
      'cash_count_recorded'
    )
  ),
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_business_id_idx on public.activity_logs (business_id, created_at desc);
create index activity_logs_actor_id_idx on public.activity_logs (actor_id);
