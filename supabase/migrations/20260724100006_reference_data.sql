-- Market Register: global reference data.
-- Adding a new payment method later is a single insert, no migration needed.

insert into public.payment_methods (code, label, sort_order, is_active)
values
  ('cash', 'Cash', 1, true),
  ('cashapp', 'Cash App', 2, true),
  ('card', 'Card', 3, true)
on conflict (code) do nothing;
