-- Market Register: Square-style inventory variants.
-- An item can now optionally have variants (color, size, type, ...) living
-- under it as their own rows, each with their own quantity. The parent item
-- keeps the shared name/category/price/cost/photo; only quantity (and the
-- variant's label) lives at the variant level. Existing items are untouched
-- (has_variants defaults to false, meaning "simple item" exactly as before).

alter table public.inventory_items
  add column has_variants boolean not null default false;

create table public.inventory_item_variants (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  item_id uuid not null references public.inventory_items (id) on delete cascade,
  value text not null check (char_length(trim(value)) > 0),
  quantity integer not null default 0 check (quantity >= 0),
  created_by uuid not null references public.profiles (id),
  updated_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, value)
);

create index inventory_item_variants_business_id_idx on public.inventory_item_variants (business_id);
create index inventory_item_variants_item_id_idx on public.inventory_item_variants (item_id);

create trigger inventory_item_variants_set_updated_at
  before update on public.inventory_item_variants
  for each row execute function public.set_updated_at();

-- Sales and adjustments need to know exactly which variant was involved (to
-- restore the right row's quantity on a void, and to show which variant an
-- adjustment touched) -- not just the human-readable label already snapshot
-- in transaction_items.color / inventory_adjustments. Deleting a variant
-- later must not break old records, so these are ON DELETE SET NULL.
alter table public.transaction_items
  add column variant_id uuid references public.inventory_item_variants (id) on delete set null;

alter table public.inventory_adjustments
  add column variant_id uuid references public.inventory_item_variants (id) on delete set null,
  add column variant_label text;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.inventory_item_variants enable row level security;

create policy inventory_item_variants_select on public.inventory_item_variants
  for select
  using (public.is_business_member(business_id));

create policy inventory_item_variants_insert_owner on public.inventory_item_variants
  for insert
  with check (public.is_business_owner(business_id));

create policy inventory_item_variants_update_owner on public.inventory_item_variants
  for update
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy inventory_item_variants_delete_owner on public.inventory_item_variants
  for delete
  using (public.is_business_owner(business_id));

-- Quantity is only mutable through adjust_inventory()/complete_sale()/
-- void_transaction(), matching the same protection inventory_items.quantity
-- already has.
revoke update on public.inventory_item_variants from authenticated;
grant update (value, updated_by, updated_at) on public.inventory_item_variants to authenticated;

alter publication supabase_realtime add table public.inventory_item_variants;
