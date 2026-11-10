-- Browser-tab titles and search descriptions for the site's built-in pages, edited in the
-- dashboard. path is the page's address (/, /map, …; app/lib/pageMeta.ts lists them); a null
-- or blank title or description keeps the site's own.

create table public.page_meta (
  path text primary key check (path ~ '^/[a-z0-9/-]*$'),
  title text check (length(title) <= 60),
  description text check (length(description) <= 200),
  updated_at timestamptz not null default now(),
  -- citext lives in the extensions schema, which only the first migration put on its search path
  updated_by extensions.citext
);

alter table public.page_meta enable row level security;
create policy "Anyone reads page titles" on public.page_meta for select using (true);
create policy "Officers add page titles" on public.page_meta for insert with check (public.is_officer());
create policy "Officers edit page titles" on public.page_meta for update using (public.is_officer());
create policy "Officers delete page titles" on public.page_meta for delete using (public.is_officer());

create trigger page_meta_touch before update on public.page_meta for each row execute function public.touch_updated_at();
