-- The areas places to eat are grouped in, editable in the dashboard; and closures for breaks
-- and holidays.
--
-- eatery_areas: slug is the area's #link and what References point at, so it stays put;
--   the title and description are what the page shows. sort is the page's order.
--   Starts with the six areas the site had in code.
-- eatery_closures: from starts_on through ends_on (Atlanta dates), the listed eateries (by
--   slug) show "Closed for <label>" in place of their hours, and the map shows them closed.

create table public.eatery_areas (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) > 0),
  description text,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.eatery_areas (slug, title, description, sort) values
  ('campus', 'On campus', 'Run by PantherDining. Pay with PantherCash, PantherMeals, or a card.', 10),
  ('park-place', 'Park Place, Edgewood, Hurt Plaza & Decatur Street', null, 20),
  ('broad-peachtree', 'Broad Street & Peachtree Street', null, 30),
  ('luckie-forsyth', 'Luckie Street, Forsyth Street & downtown core', null, 40),
  ('peachtree-center', 'The Hub at Peachtree Center', 'Food court under Peachtree Center, connected to the Peachtree Center MARTA station. Mostly a weekday lunch scene: many counters close early evening and on weekends.', 50),
  ('piedmont-auburn', 'Piedmont Avenue, Auburn Avenue & Sweet Auburn', null, 60);

-- An eatery's area has to be one of them, and an area with eateries can't be deleted
alter table public.eateries add constraint eateries_area_fkey foreign key (area) references public.eatery_areas (slug) on delete restrict;

alter table public.eatery_areas enable row level security;
create policy "Anyone reads eatery areas" on public.eatery_areas for select using (true);
create policy "Officers add eatery areas" on public.eatery_areas for insert with check (public.is_officer());
create policy "Officers edit eatery areas" on public.eatery_areas for update using (public.is_officer());
create policy "Officers delete eatery areas" on public.eatery_areas for delete using (public.is_officer());

create table public.eatery_closures (
  id uuid primary key default gen_random_uuid(),
  label text not null check (length(trim(label)) > 0),
  starts_on date not null,
  ends_on date not null,
  eateries text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index eatery_closures_dates on public.eatery_closures (ends_on, starts_on);

alter table public.eatery_closures enable row level security;
create policy "Anyone reads eatery closures" on public.eatery_closures for select using (true);
create policy "Officers add eatery closures" on public.eatery_closures for insert with check (public.is_officer());
create policy "Officers edit eatery closures" on public.eatery_closures for update using (public.is_officer());
create policy "Officers delete eatery closures" on public.eatery_closures for delete using (public.is_officer());

create trigger eatery_areas_touch before update on public.eatery_areas for each row execute function public.touch_updated_at();
create trigger eatery_closures_touch before update on public.eatery_closures for each row execute function public.touch_updated_at();
