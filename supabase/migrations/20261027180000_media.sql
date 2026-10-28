-- Images officers upload for posts and pages (the editor's Image tool, pasted or dropped
-- images, and cover images).
--
-- One public bucket: anyone can view a file by its address (it's on a published page), and
-- only officers can add, replace, or remove files. Storage itself turns away anything that
-- isn't one of these image types, or is over 5 MB. SVG is left out on purpose: it can carry
-- script.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets serve files without a select policy, so these are only about writing
create policy "Officers upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_officer());
create policy "Officers replace media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_officer());
create policy "Officers remove media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_officer());
