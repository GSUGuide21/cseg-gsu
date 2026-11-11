-- Pages that sit in the site's menu and under one another, and more for the campus guides.
--
-- pages: a page can be listed in the header's "More" menu, the footer, or both, under its
--   own label and in a set order; and it can sit under another page (/guides/parking). One
--   level only: a page with a parent can't be a parent itself.
-- map_places, eateries, resources: a short tip in a student's voice, shown with the place.
-- guide_picks: officers' collections ("First-week essentials", "Late-night food"), featured
--   at the top of Places to eat and Resources, and under the campus map.

set search_path = public, extensions;

-- ── Pages ───────────────────────────────────────────────────────────────────

alter table public.pages
  add column parent_id uuid references public.pages (id) on delete set null,
  add column nav_placement text not null default 'none' check (nav_placement in ('none', 'header', 'footer', 'both')),
  add column nav_label text check (nav_label is null or length(trim(nav_label)) between 1 and 40),
  add column nav_sort integer not null default 0,
  add constraint pages_not_own_parent check (parent_id is null or parent_id <> id);

create index pages_parent_idx on public.pages (parent_id);

-- One level deep: a page under another can't have pages under it
create or replace function public.keep_pages_one_level() returns trigger
language plpgsql set search_path = public, extensions
as $$
begin
  if new.parent_id is not null then
    if exists (select 1 from public.pages where id = new.parent_id and parent_id is not null) then
      raise exception 'That page already sits under another, so nothing can sit under it.' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.pages where parent_id = new.id) then
      raise exception 'Other pages sit under this one, so it can''t go under another.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger pages_one_level before insert or update of parent_id on public.pages for each row execute function public.keep_pages_one_level();

-- ── Tips ────────────────────────────────────────────────────────────────────

alter table public.map_places add column tip text check (tip is null or length(trim(tip)) between 1 and 240);
alter table public.eateries add column tip text check (tip is null or length(trim(tip)) between 1 and 240);
alter table public.resources add column tip text check (tip is null or length(trim(tip)) between 1 and 240);

-- ── Curated picks ───────────────────────────────────────────────────────────

create table public.guide_picks (
  id uuid primary key default gen_random_uuid(),
  -- Which guide it's featured on, and so what its items are: map places, eateries, or resources
  guide text not null check (guide in ('map', 'eat', 'resources')),
  title text not null check (length(trim(title)) between 1 and 80),
  description text check (description is null or length(description) <= 240),
  -- One of the site's card icons, by name
  icon text not null default 'star',
  -- What's in it, in order: place ids, eatery slugs, or resource slugs
  items text[] not null default '{}' check (cardinality(items) <= 12),
  sort integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guide_picks enable row level security;
create policy "Anyone reads published picks" on public.guide_picks for select using (published or public.is_officer());
create policy "Officers add picks" on public.guide_picks for insert with check (public.is_officer());
create policy "Officers edit picks" on public.guide_picks for update using (public.is_officer());
create policy "Officers delete picks" on public.guide_picks for delete using (public.is_officer());

create trigger guide_picks_touch before update on public.guide_picks for each row execute function public.touch_updated_at();
