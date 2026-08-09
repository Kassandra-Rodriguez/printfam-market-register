-- Persist the option/dimension label (e.g. "Color", "Size") chosen for a
-- variant item, so filters can group by what the label actually means
-- instead of assuming every variant item's options are colors.
-- (inventory_adjustments already has its own variant_label column, added in
-- 20260725120001 -- that one is an audit snapshot per adjustment and is
-- unrelated to this one, which lives on the item itself.)

alter table public.inventory_items
  add column variant_label text;
