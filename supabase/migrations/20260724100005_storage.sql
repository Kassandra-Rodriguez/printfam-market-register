-- Market Register: storage buckets for logos, item photos, and avatars.
-- Convention: object path is "<business_id-or-user_id>/<filename>" so RLS can
-- key off the leading folder segment. Buckets are public for read (images are
-- not sensitive) but writes are restricted to the owning business/user.

insert into storage.buckets (id, name, public)
values
  ('business-logos', 'business-logos', true),
  ('inventory-images', 'inventory-images', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Public read business logos"
  on storage.objects for select
  using (bucket_id = 'business-logos');

create policy "Owner manages business logo"
  on storage.objects for all
  using (bucket_id = 'business-logos' and public.is_business_owner((storage.foldername(name))[1]::uuid))
  with check (bucket_id = 'business-logos' and public.is_business_owner((storage.foldername(name))[1]::uuid));

create policy "Public read inventory images"
  on storage.objects for select
  using (bucket_id = 'inventory-images');

create policy "Owner manages inventory images"
  on storage.objects for all
  using (bucket_id = 'inventory-images' and public.is_business_owner((storage.foldername(name))[1]::uuid))
  with check (bucket_id = 'inventory-images' and public.is_business_owner((storage.foldername(name))[1]::uuid));

create policy "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users manage their own avatar"
  on storage.objects for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
