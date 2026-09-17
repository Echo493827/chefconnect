-- chefconnect :: 0007_storage.sql
-- Image storage for class photos, galleries, and chef profiles. A single public
-- bucket: anyone can view images (they're meant to be seen), but a signed-in
-- user can only write files under their own {user_id}/ folder, so no one can
-- overwrite or delete someone else's uploads. Depends on 0001-0006.
--
-- Note: storage.objects already has RLS enabled by Supabase; we only add policies.

insert into storage.buckets (id, name, public)
values ('class-images', 'class-images', true)
on conflict (id) do nothing;

-- Public read: the bucket is public, but state it explicitly for clarity.
drop policy if exists "class-images public read" on storage.objects;
create policy "class-images public read" on storage.objects
  for select
  using (bucket_id = 'class-images');

-- Writes are scoped to the uploader's own folder (path starts with their user id).
drop policy if exists "class-images owner insert" on storage.objects;
create policy "class-images owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'class-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "class-images owner update" on storage.objects;
create policy "class-images owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'class-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'class-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "class-images owner delete" on storage.objects;
create policy "class-images owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'class-images' and (storage.foldername(name))[1] = auth.uid()::text);
