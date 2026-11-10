-- The club's own events and its executives, edited in the dashboard.
--
-- events: CSEG's events that aren't on PIN as Public (past ones, mostly; PIN's are read from
--   PIN). slug is the event's id, the one check-ins are kept under (event_checkins.event_id),
--   made from its name and date and kept, so renaming one keeps its check-ins. The site shows
--   one under Upcoming until it ends, then under Past events.
-- executives: the /executives page. service is when they served, as
--   [{ "startYear": 2025, "endYear": null }, …]; one with no endYear is serving now.
--   contact is what they share on the page: { "email", "phone", "linkedIn", "instagram", … }.
-- `npm run events:seed` copies the site's built-in past events in.

create table public.events (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  description text not null default '',
  href text check (href is null or href ~ '^https?://'),
  image_url text check (image_url is null or image_url ~ '^https://'),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index events_starts on public.events (starts_at desc);

create table public.executives (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text not null check (length(trim(last_name)) > 0),
  role text not null check (length(trim(role)) > 0),
  bio text not null default '',
  is_founder boolean not null default false,
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  service jsonb not null default '[]' check (jsonb_typeof(service) = 'array'),
  contact jsonb not null default '{}' check (jsonb_typeof(contact) = 'object'),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;
create policy "Anyone reads published events" on public.events for select using (published or public.is_officer());
create policy "Officers add events" on public.events for insert with check (public.is_officer());
create policy "Officers edit events" on public.events for update using (public.is_officer());
create policy "Officers delete events" on public.events for delete using (public.is_officer());

alter table public.executives enable row level security;
create policy "Anyone reads published executives" on public.executives for select using (published or public.is_officer());
create policy "Officers add executives" on public.executives for insert with check (public.is_officer());
create policy "Officers edit executives" on public.executives for update using (public.is_officer());
create policy "Officers delete executives" on public.executives for delete using (public.is_officer());

create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();
create trigger executives_touch before update on public.executives for each row execute function public.touch_updated_at();
