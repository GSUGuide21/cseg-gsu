-- Affiliates, the map's skybridges and shortcuts, and messages sent from the Contact page.
--
-- affiliates: the /affiliates list and each one's /affiliates/<slug> page. description is
--   its paragraphs, separated by a blank line. logo_url is an https:// upload, or a path
--   under public/ (the built-in ones, like /affiliates/lead-team.jpg).
-- map_connections: skybridges, indoor links, and shortcuts the campus map's route finder
--   uses (app/lib/wayfinding.ts's Connection). slug is the id routes and steps know it by.
--   path is [[lat, lng], …], two points or more. in_osm: OpenStreetMap already has it, so
--   it's drawn for reference only (half_width is how wide OSM's walkway is, in meters).
--   ends: the place ids at each end, entered through their doors, or none for an outdoor
--   path. favor: counts as this fraction of its length (under 1 to prefer it). penalty:
--   extra effort in meters, like climbing a few floors.
-- contact_messages: what visitors send from /contact. Anyone can send one; only officers
--   read them. read_at is when an officer first opened it.
-- `npm run affiliates:seed` and `npm run connections:seed` copy the built-in lists in.

-- citext lives in the extensions schema; find it while this migration runs
set search_path = public, extensions;

create table public.affiliates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  short_name text not null check (length(trim(short_name)) > 0),
  wordmark_top text not null check (length(trim(wordmark_top)) > 0),
  wordmark_bottom text not null default '',
  summary text,
  description text not null default '',
  instagram text not null check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  pin_key text check (pin_key is null or pin_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_url text check (logo_url is null or logo_url ~ '^(https://|/)'),
  discord_url text check (discord_url is null or discord_url ~ '^https://'),
  sort integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.map_connections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  kind text not null check (kind in ('skybridge', 'indoor', 'shortcut')),
  note text not null default '',
  path jsonb not null check (jsonb_typeof(path) = 'array' and jsonb_array_length(path) >= 2),
  in_osm boolean not null default false,
  half_width real check (half_width is null or half_width > 0),
  favor real check (favor is null or (favor > 0 and favor <= 2)),
  ends text[] not null default '{}' check (cardinality(ends) in (0, 2)),
  stairs boolean not null default false,
  penalty real check (penalty is null or penalty >= 0),
  sort integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  email citext not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' and length(email) <= 254),
  subject text check (subject is null or length(subject) <= 160),
  body text not null check (length(trim(body)) between 1 and 5000),
  read_at timestamptz,
  read_by citext,
  created_at timestamptz not null default now()
);

create index contact_messages_recent on public.contact_messages (created_at desc);

alter table public.affiliates enable row level security;
create policy "Anyone reads published affiliates" on public.affiliates for select using (published or public.is_officer());
create policy "Officers add affiliates" on public.affiliates for insert with check (public.is_officer());
create policy "Officers edit affiliates" on public.affiliates for update using (public.is_officer());
create policy "Officers delete affiliates" on public.affiliates for delete using (public.is_officer());

alter table public.map_connections enable row level security;
create policy "Anyone reads published connections" on public.map_connections for select using (published or public.is_officer());
create policy "Officers add connections" on public.map_connections for insert with check (public.is_officer());
create policy "Officers edit connections" on public.map_connections for update using (public.is_officer());
create policy "Officers delete connections" on public.map_connections for delete using (public.is_officer());

-- Anyone may send one (unread); only officers see, mark, or delete them
alter table public.contact_messages enable row level security;
create policy "Anyone sends a message" on public.contact_messages for insert with check (read_at is null and read_by is null);
create policy "Officers read messages" on public.contact_messages for select using (public.is_officer());
create policy "Officers mark messages" on public.contact_messages for update using (public.is_officer());
create policy "Officers delete messages" on public.contact_messages for delete using (public.is_officer());

-- Three messages from one address in ten minutes, at most, so a script can't flood the inbox
create or replace function public.limit_contact_messages() returns trigger
language plpgsql security definer set search_path = public, extensions
as $$
begin
  if (select count(*) from public.contact_messages where email = new.email and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Too many messages from this address; try again in a few minutes.' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger contact_messages_limit before insert on public.contact_messages for each row execute function public.limit_contact_messages();
create trigger affiliates_touch before update on public.affiliates for each row execute function public.touch_updated_at();
create trigger map_connections_touch before update on public.map_connections for each row execute function public.touch_updated_at();
