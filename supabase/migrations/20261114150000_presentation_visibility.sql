-- Who can open a published presentation.
--
-- visibility:
--   public   - listed at /presentations, in search and the sitemap; anyone can open it.
--   unlisted - opens for anyone who has its address, but isn't listed anywhere.
--   private  - officers only, presented from the dashboard; its address on the site isn't found.
-- Drafts are for officers whatever this says.

alter table public.presentations
  add column visibility text not null default 'public' check (visibility in ('public', 'unlisted', 'private'));

drop policy "Anyone reads published presentations" on public.presentations;
create policy "Anyone reads published presentations" on public.presentations for select using (
  (status = 'published' and visibility <> 'private') or public.is_officer()
);
