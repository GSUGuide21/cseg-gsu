-- Places to eat, edited in the dashboard: the /eat page's lists (and any page's Eateries
-- block), and the campus map's Food pins with their "Open now" hours.
--
-- slug: the eatery's map pin id and #link (/map?place=…), so links stay put when it's renamed.
-- area: one of the page's areas (campus, park-place, …), as app/lib/eateries.ts lists them.
-- schedule: weekly hours for "Open now": [{ days: [0-6], open: "HH:mm", close: "HH:mm" }],
--   null when they aren't known. hours is the same, in words.
-- lat/lng: its own pin; without one, place_id names the map place it's inside.
-- locations: one pin per location for a listing with several:
--   [{ id, label, lat, lng, schedule }].
-- sort: its order within its area.

create table public.eateries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  area text not null,
  dining_hall boolean not null default false,
  address text not null default '',
  description text not null default '',
  hours text,
  schedule jsonb check (schedule is null or jsonb_typeof(schedule) = 'array'),
  status text,
  note text,
  lat double precision check (lat between 33.70 and 33.80),
  lng double precision check (lng between -84.43 and -84.33),
  locations jsonb not null default '[]'::jsonb check (jsonb_typeof(locations) = 'array'),
  place_id text,
  url text,
  aliases text[] not null default '{}',
  sort integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((lat is null) = (lng is null))
);

create index eateries_area_sort on public.eateries (area, sort);

alter table public.eateries enable row level security;
create policy "Anyone reads published eateries" on public.eateries for select using (published or public.is_officer());
create policy "Officers add eateries" on public.eateries for insert with check (public.is_officer());
create policy "Officers edit eateries" on public.eateries for update using (public.is_officer());
create policy "Officers delete eateries" on public.eateries for delete using (public.is_officer());

create trigger eateries_touch before update on public.eateries for each row execute function public.touch_updated_at();
