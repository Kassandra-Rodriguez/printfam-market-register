-- Allow the business owner to delete a closed event. Events with dependent
-- transactions or cash_counts can't actually be removed thanks to the
-- existing FK RESTRICT on transactions.event_id / cash_counts.event_id --
-- this policy just decides who's allowed to attempt it and under what
-- status, matching the app's "archive/guard, don't cascade-delete real
-- data" convention.
create policy events_delete on public.events
  for delete
  using (public.is_business_owner(business_id) and status = 'closed');
