-- More for pages officers write in the dashboard.
--
-- eyebrow: the small label above the title; null shows the site's own (CSEG, or About on /about).
-- share_image_url: the picture link previews show (social posts, texts); null for none.
-- show_toc: in the sections layout, an "On this page" list of the sections under the title.
-- show_updated: an "Updated <date>" line under the title.
-- publish_at / unpublish_at: a published page shows from publish_at (null: right away) until
--   unpublish_at (null: for good). Outside that window only officers see it.
-- page_redirects: a page's old web addresses. When a page's slug changes, its old one
--   forwards to it, so links shared before the change still work.

set search_path = public, extensions;

alter table public.pages
  add column eyebrow text check (length(eyebrow) <= 40),
  add column share_image_url text check (share_image_url ~ '^https://'),
  add column show_toc boolean not null default false,
  add column show_updated boolean not null default false,
  add column publish_at timestamptz,
  add column unpublish_at timestamptz,
  add constraint pages_schedule_order check (publish_at is null or unpublish_at is null or unpublish_at > publish_at);

-- Published, and inside its window
drop policy "Anyone reads published pages" on public.pages;
create policy "Anyone reads published pages" on public.pages for select using (
  (status = 'published' and (publish_at is null or publish_at <= now()) and (unpublish_at is null or unpublish_at > now()))
  or public.is_officer()
);

create table public.page_redirects (
  from_slug text primary key check (from_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  page_id uuid not null references public.pages (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.page_redirects enable row level security;
create policy "Anyone reads page redirects" on public.page_redirects for select using (true);
create policy "Officers remove page redirects" on public.page_redirects for delete using (public.is_officer());

-- Keeps the old address when a slug changes. A page taking an address another page used to
-- have takes it over, so the redirect never shadows a real page.
create or replace function public.remember_old_slug() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.slug is distinct from old.slug then
    insert into public.page_redirects (from_slug, page_id) values (old.slug, new.id)
      on conflict (from_slug) do update set page_id = excluded.page_id, created_at = now();
  end if;
  delete from public.page_redirects where from_slug = new.slug;
  return null;
end
$$;

create trigger pages_remember_old_slug after insert or update of slug on public.pages for each row execute function public.remember_old_slug();
