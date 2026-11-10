-- Running the club: terms and dues, requests to join, RSVPs, minutes; and more of the site
-- from the dashboard: common questions, forwarded addresses, sponsors, and more settings.
--
-- officers.role gains 'editor': someone who writes the site (posts, pages, media, the campus
--   guide) and never sees people's details. is_staff() is an officer who isn't one; members,
--   check-ins, messages, and the tables here about people are theirs alone.
-- club_settings: the other places the club is online, a notice across the site (shown
--   through banner_until, an Atlanta date, or until cleared), whether it's taking members and
--   what dues cost, whether the Contact form is on and what it says after, what search and
--   link previews fall back to, and how guests are handled at the door.
-- terms: semesters, by date. The current one is the one today falls in.
-- dues_payments: one per member per term.
-- join_requests: sent from /join by anyone while the club is taking members; an officer
--   approves one into members.
-- event_rsvps: sent from /events for one of the club's own events that hasn't ended.
-- faqs: /about's common questions, in order. Until there are any, the built-in ones show.
-- redirects: an old address on the site and where it goes now.
-- meeting_minutes: officers' own record of a meeting.
-- sponsors: shown on /affiliates while published and inside their dates.

set search_path = public, extensions;

-- ── Editors ─────────────────────────────────────────────────────────────────

alter type public.officer_role add value if not exists 'editor';

-- Compared as text: a value added to an enum can't be used until this migration commits
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public, extensions
as $$ select exists (select 1 from public.officers where email = public.current_email() and role::text <> 'editor') $$;

drop policy "Officers manage members" on public.members;
create policy "Staff manage members" on public.members for all using (public.is_staff()) with check (public.is_staff());

drop policy "Officers manage check-ins" on public.event_checkins;
create policy "Staff manage check-ins" on public.event_checkins for all using (public.is_staff()) with check (public.is_staff());

drop policy "Officers read messages" on public.contact_messages;
drop policy "Officers mark messages" on public.contact_messages;
drop policy "Officers delete messages" on public.contact_messages;
create policy "Staff read messages" on public.contact_messages for select using (public.is_staff());
create policy "Staff mark messages" on public.contact_messages for update using (public.is_staff());
create policy "Staff delete messages" on public.contact_messages for delete using (public.is_staff());

-- ── Settings ────────────────────────────────────────────────────────────────

alter table public.club_settings
  add column x_url text check (x_url is null or x_url ~ '^https://'),
  add column pin_url text check (pin_url is null or pin_url ~ '^https://'),
  add column groupme_url text check (groupme_url is null or groupme_url ~ '^https://'),
  add column linktree_url text check (linktree_url is null or linktree_url ~ '^https://'),
  add column discord_url text check (discord_url is null or discord_url ~ '^https://'),
  add column linkedin_url text check (linkedin_url is null or linkedin_url ~ '^https://'),
  add column youtube_url text check (youtube_url is null or youtube_url ~ '^https://'),
  add column banner_message text check (banner_message is null or length(banner_message) <= 200),
  add column banner_href text check (banner_href is null or banner_href ~ '^(https://|/)'),
  add column banner_tone text not null default 'info' check (banner_tone in ('info', 'success', 'warning')),
  add column banner_until date,
  add column accepting_members boolean not null default true,
  add column dues_amount numeric(7, 2) check (dues_amount is null or dues_amount >= 0),
  add column contact_form_open boolean not null default true,
  add column contact_reply text check (contact_reply is null or length(contact_reply) <= 300),
  add column site_description text check (site_description is null or length(site_description) <= 300),
  add column share_image_url text check (share_image_url is null or share_image_url ~ '^https://'),
  add column walkins_allowed boolean not null default true,
  add column walkins_become_members boolean not null default false;

-- ── Terms and dues ──────────────────────────────────────────────────────────

create table public.terms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 60),
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

alter table public.terms enable row level security;
create policy "Officers read terms" on public.terms for select using (public.is_officer());
create policy "Admins add terms" on public.terms for insert with check (public.is_admin());
create policy "Admins edit terms" on public.terms for update using (public.is_admin());
create policy "Admins delete terms" on public.terms for delete using (public.is_admin());

create table public.dues_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  -- A term with payments can't be deleted out from under them
  term_id uuid not null references public.terms (id) on delete restrict,
  amount numeric(7, 2) not null check (amount >= 0),
  paid_on date not null default current_date,
  method text not null default 'cash' check (method in ('cash', 'card', 'transfer', 'waived', 'other')),
  note text,
  recorded_by citext default public.current_email(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, term_id)
);
create index dues_payments_term on public.dues_payments (term_id);

alter table public.dues_payments enable row level security;
create policy "Staff manage dues" on public.dues_payments for all using (public.is_staff()) with check (public.is_staff());

-- ── Requests to join ────────────────────────────────────────────────────────

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  email citext not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' and length(email) <= 254),
  major text check (major is null or length(major) <= 120),
  year text check (year is null or year in ('Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate')),
  message text check (message is null or length(message) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  -- Who they became, once approved
  member_id uuid references public.members (id) on delete set null,
  handled_at timestamptz,
  handled_by citext,
  created_at timestamptz not null default now()
);
create index join_requests_recent on public.join_requests (created_at desc);

-- Anyone may send one (pending), while the club is taking members; only staff see or settle them
alter table public.join_requests enable row level security;
create policy "Anyone asks to join" on public.join_requests for insert
  with check (status = 'pending' and member_id is null and handled_at is null and handled_by is null and (select accepting_members from public.club_settings where id = 1));
create policy "Staff read requests" on public.join_requests for select using (public.is_staff());
create policy "Staff settle requests" on public.join_requests for update using (public.is_staff());
create policy "Staff delete requests" on public.join_requests for delete using (public.is_staff());

-- One open request per address, and three a day at most
create or replace function public.limit_join_requests() returns trigger
language plpgsql security definer set search_path = public, extensions
as $$
begin
  if exists (select 1 from public.join_requests where email = new.email and status = 'pending') then
    raise exception 'We already have your request; an officer will be in touch.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.join_requests where email = new.email and created_at > now() - interval '1 day') >= 3 then
    raise exception 'Too many requests from this address; try again tomorrow.' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger join_requests_limit before insert on public.join_requests for each row execute function public.limit_join_requests();

-- ── RSVPs ───────────────────────────────────────────────────────────────────

create table public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  -- One of the club's own events, by its slug (as check-ins keep it)
  event_id text not null,
  name text not null check (length(trim(name)) between 1 and 120),
  email citext not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' and length(email) <= 254),
  created_at timestamptz not null default now(),
  -- One per person per event
  unique (event_id, email)
);
create index event_rsvps_event on public.event_rsvps (event_id);

-- Anyone may RSVP to an event that's shown, still on, and not over
alter table public.event_rsvps enable row level security;
create policy "Anyone RSVPs to an open event" on public.event_rsvps for insert
  with check (exists (select 1 from public.events e where e.slug = event_id and e.published and e.status = 'scheduled' and e.ends_at > now()));
create policy "Staff read RSVPs" on public.event_rsvps for select using (public.is_staff());
create policy "Staff delete RSVPs" on public.event_rsvps for delete using (public.is_staff());

-- Ten from one address in ten minutes, at most
create or replace function public.limit_event_rsvps() returns trigger
language plpgsql security definer set search_path = public, extensions
as $$
begin
  if (select count(*) from public.event_rsvps where email = new.email and created_at > now() - interval '10 minutes') >= 10 then
    raise exception 'Too many RSVPs from this address; try again in a few minutes.' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger event_rsvps_limit before insert on public.event_rsvps for each row execute function public.limit_event_rsvps();

-- ── Common questions ────────────────────────────────────────────────────────

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null check (length(trim(question)) between 1 and 200),
  answer text not null check (length(trim(answer)) between 1 and 2000),
  sort integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.faqs enable row level security;
create policy "Anyone reads published questions" on public.faqs for select using (published or public.is_officer());
create policy "Officers add questions" on public.faqs for insert with check (public.is_officer());
create policy "Officers edit questions" on public.faqs for update using (public.is_officer());
create policy "Officers delete questions" on public.faqs for delete using (public.is_officer());

-- ── Forwarded addresses ─────────────────────────────────────────────────────

create table public.redirects (
  id uuid primary key default gen_random_uuid(),
  -- Lowercase, no trailing slash: /welcome-week
  from_path text not null unique check (from_path ~ '^/[a-z0-9_-]+(/[a-z0-9_-]+)*$' and length(from_path) <= 200),
  -- A path here, or a full link elsewhere
  to_path text not null check (to_path ~ '^(/|https://)' and length(to_path) <= 500),
  note text,
  created_by citext default public.current_email(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_path <> to_path)
);

alter table public.redirects enable row level security;
create policy "Anyone follows redirects" on public.redirects for select using (true);
create policy "Officers add redirects" on public.redirects for insert with check (public.is_officer());
create policy "Officers edit redirects" on public.redirects for update using (public.is_officer());
create policy "Officers delete redirects" on public.redirects for delete using (public.is_officer());

-- ── Minutes ─────────────────────────────────────────────────────────────────

create table public.meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  held_on date not null,
  title text not null check (length(trim(title)) between 1 and 160),
  attendees text[] not null default '{}',
  notes text not null default '',
  -- The full document, if it's kept somewhere else
  file_url text check (file_url is null or file_url ~ '^https://'),
  recorded_by citext default public.current_email(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meeting_minutes_recent on public.meeting_minutes (held_on desc);

alter table public.meeting_minutes enable row level security;
create policy "Staff manage minutes" on public.meeting_minutes for all using (public.is_staff()) with check (public.is_staff());

-- ── Sponsors ────────────────────────────────────────────────────────────────

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  href text check (href is null or href ~ '^https://'),
  logo_url text check (logo_url is null or logo_url ~ '^(https://|/)'),
  tier text not null default 'supporter' check (tier in ('presenting', 'partner', 'supporter')),
  blurb text check (blurb is null or length(blurb) <= 300),
  -- Shown from starts_on through ends_on, Atlanta dates; null for no limit
  starts_on date,
  ends_on date,
  sort integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_on is null or ends_on is null or ends_on >= starts_on)
);

alter table public.sponsors enable row level security;
create policy "Anyone reads published sponsors" on public.sponsors for select using (published or public.is_officer());
create policy "Officers add sponsors" on public.sponsors for insert with check (public.is_officer());
create policy "Officers edit sponsors" on public.sponsors for update using (public.is_officer());
create policy "Officers delete sponsors" on public.sponsors for delete using (public.is_officer());

create trigger terms_touch before update on public.terms for each row execute function public.touch_updated_at();
create trigger dues_payments_touch before update on public.dues_payments for each row execute function public.touch_updated_at();
create trigger faqs_touch before update on public.faqs for each row execute function public.touch_updated_at();
create trigger redirects_touch before update on public.redirects for each row execute function public.touch_updated_at();
create trigger meeting_minutes_touch before update on public.meeting_minutes for each row execute function public.touch_updated_at();
create trigger sponsors_touch before update on public.sponsors for each row execute function public.touch_updated_at();
