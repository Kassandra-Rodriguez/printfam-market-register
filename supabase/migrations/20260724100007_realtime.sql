-- Market Register: enable Realtime replication for the tables the app
-- subscribes to from the browser (inventory quantity updates, new/voided
-- transactions, event status changes, cash counts). RLS still applies to
-- realtime payloads, so a client only ever receives changes for rows it's
-- already allowed to select.

alter publication supabase_realtime add table public.inventory_items;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.cash_counts;
