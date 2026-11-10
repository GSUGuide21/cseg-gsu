-- Lets officers list the media bucket, for the dashboard's Media page and image picker.
--
-- Files were already public by their address, but Storage's list goes through row-level
-- security, and until now nothing allowed it, so listing came back empty.

create policy "Officers list media" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_officer());
