-- The officer dashboard: who can use it, and what it manages.
--
-- Everything is guarded by row-level security. Officers (listed in public.officers by
-- email) can read and change dashboard data; admins can also manage the officer list and
-- club settings. Anyone, signed in or not, can read what's published: posts, pages, map
-- places, and the club's public settings.
--
-- After running this, add the first admin by hand (SQL editor, as the postgres role):
--   insert into public.officers (email, name, role, title) values ('you@example.com', 'Your Name', 'admin', 'President');

-- Case-insensitive text, so Jordan@GSU.edu and jordan@gsu.edu are one officer. Supabase keeps
-- extensions in their own schema.
create extension if not exists citext with schema extensions;
-- So the citext type below is found while this migration runs
set search_path = public, extensions;

-- ── Who can sign in ─────────────────────────────────────────────────────────

create type public.officer_role as enum ('officer', 'admin');

create table public.officers (
  email citext primary key,
  name text,
  title text,
  role public.officer_role not null default 'officer',
  created_at timestamptz not null default now()
);

-- The signed-in user's email, from their verified token
create or replace function public.current_email() returns citext
language sql stable set search_path = public, extensions
as $$ select nullif(auth.jwt() ->> 'email', '')::citext $$;

-- security definer: these read officers without tripping its own policies
create or replace function public.is_officer() returns boolean
language sql stable security definer set search_path = public, extensions
as $$ select exists (select 1 from public.officers where email = public.current_email()) $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, extensions
as $$ select exists (select 1 from public.officers where email = public.current_email() and role = 'admin') $$;

alter table public.officers enable row level security;
create policy "Officers see the officer list" on public.officers for select using (public.is_officer());
create policy "Admins add officers" on public.officers for insert with check (public.is_admin());
create policy "Admins change officers" on public.officers for update using (public.is_admin());
create policy "Admins remove officers" on public.officers for delete using (public.is_admin() and email <> public.current_email());

-- ── Members ─────────────────────────────────────────────────────────────────

create type public.member_status as enum ('active', 'new', 'inactive');

create table public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  email citext unique,
  major text,
  year text check (year in ('Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate')),
  status public.member_status not null default 'new',
  joined_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.members enable row level security;
create policy "Officers manage members" on public.members for all using (public.is_officer()) with check (public.is_officer());

-- ── Event check-ins (events themselves come from PIN) ───────────────────────

create table public.event_checkins (
  id uuid primary key default gen_random_uuid(),
  -- PIN's event id, or the id of a past event listed in the site's code
  event_id text not null,
  member_id uuid references public.members (id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  email citext,
  checked_in_at timestamptz not null default now(),
  checked_in_by citext default public.current_email(),
  -- One check-in per person per event
  unique (event_id, email)
);
create index event_checkins_event on public.event_checkins (event_id);

alter table public.event_checkins enable row level security;
create policy "Officers manage check-ins" on public.event_checkins for all using (public.is_officer()) with check (public.is_officer());

-- ── Posts and pages (markdown) ──────────────────────────────────────────────

create type public.publish_status as enum ('draft', 'published');

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) > 0),
  excerpt text,
  body text not null default '',
  cover_image_url text,
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  author_email citext default public.current_email(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts enable row level security;
create policy "Anyone reads published posts" on public.posts for select using (status = 'published' or public.is_officer());
create policy "Officers write posts" on public.posts for insert with check (public.is_officer());
create policy "Officers edit posts" on public.posts for update using (public.is_officer());
create policy "Officers delete posts" on public.posts for delete using (public.is_officer());

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) > 0),
  description text,
  body text not null default '',
  status public.publish_status not null default 'draft',
  updated_by citext default public.current_email(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pages enable row level security;
create policy "Anyone reads published pages" on public.pages for select using (status = 'published' or public.is_officer());
create policy "Officers write pages" on public.pages for insert with check (public.is_officer());
create policy "Officers edit pages" on public.pages for update using (public.is_officer());
create policy "Officers delete pages" on public.pages for delete using (public.is_officer());

-- ── Club pins on the campus map ─────────────────────────────────────────────

create table public.map_places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  -- One of the map's categories (student-life, study, food, …)
  category text not null default 'student-life',
  lat double precision not null check (lat between 33.70 and 33.80),
  lng double precision not null check (lng between -84.43 and -84.33),
  address text,
  description text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.map_places enable row level security;
create policy "Anyone reads published map places" on public.map_places for select using (published or public.is_officer());
create policy "Officers manage map places" on public.map_places for insert with check (public.is_officer());
create policy "Officers edit map places" on public.map_places for update using (public.is_officer());
create policy "Officers delete map places" on public.map_places for delete using (public.is_officer());

-- ── Club settings (one row) ─────────────────────────────────────────────────

create table public.club_settings (
  id smallint primary key default 1 check (id = 1),
  tagline text,
  meeting_info text,
  contact_email citext,
  instagram_url text,
  updated_at timestamptz not null default now(),
  updated_by citext
);
insert into public.club_settings (id) values (1);

alter table public.club_settings enable row level security;
create policy "Anyone reads club settings" on public.club_settings for select using (true);
create policy "Admins change club settings" on public.club_settings for update using (public.is_admin());

-- ── What officers did (the Overview's activity feed) ────────────────────────

create table public.activity (
  id bigint generated always as identity primary key,
  actor_email citext not null default public.current_email(),
  action text not null,
  subject text,
  created_at timestamptz not null default now()
);
create index activity_recent on public.activity (created_at desc);

alter table public.activity enable row level security;
create policy "Officers read activity" on public.activity for select using (public.is_officer());
-- Written as the signed-in officer, so nobody can log as someone else
create policy "Officers log their own activity" on public.activity for insert with check (public.is_officer() and actor_email = public.current_email());

-- ── updated_at stays current ────────────────────────────────────────────────

create or replace function public.touch_updated_at() returns trigger
language plpgsql
as $$ begin new.updated_at = now(); return new; end $$;

create trigger members_touch before update on public.members for each row execute function public.touch_updated_at();
create trigger posts_touch before update on public.posts for each row execute function public.touch_updated_at();
create trigger pages_touch before update on public.pages for each row execute function public.touch_updated_at();
create trigger map_places_touch before update on public.map_places for each row execute function public.touch_updated_at();
create trigger club_settings_touch before update on public.club_settings for each row execute function public.touch_updated_at();
