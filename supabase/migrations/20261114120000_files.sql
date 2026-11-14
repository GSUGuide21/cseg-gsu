-- Files officers attach to posts and pages (the editor's File block): flyers, forms, PDFs,
-- slides, and spreadsheets.
--
-- Their own public bucket, apart from images: anyone can open a file by its address (it's
-- linked from a published page), and only officers can add, replace, or remove one. Storage
-- turns away anything over 15 MB, and anything that isn't one of these document types; web
-- pages, scripts, and programs are left out on purpose, so nothing here runs in a browser.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'files',
  'files',
  true,
  15728640,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'text/csv',
    'text/plain',
    'text/calendar'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets serve files without a select policy; this one is for listing them
create policy "Officers list files" on storage.objects for select to authenticated
  using (bucket_id = 'files' and public.is_officer());
create policy "Officers upload files" on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and public.is_officer());
create policy "Officers replace files" on storage.objects for update to authenticated
  using (bucket_id = 'files' and public.is_officer());
create policy "Officers remove files" on storage.objects for delete to authenticated
  using (bucket_id = 'files' and public.is_officer());
