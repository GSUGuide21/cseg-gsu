-- More about each of the club's events, as the dashboard's event form asks for it.
--
-- status: 'scheduled', or 'cancelled' (the site still lists it, marked, so nobody shows up
--   to an empty room). Whether it's on now or over is worked out from its times.
-- image_alt: what the picture says, for screen readers; a flyer's should restate its key text.
-- tags: a few words for it, like "discussion" or "free food".
-- online_url: where to join it online, if it can be.
-- sessions: every time and place it meets, when there's more than one:
--   [{ "start": "…", "end": "…", "location": "…" }, …]. starts_at and ends_at stay the
--   first start and the last end, and location the first place, so a one-time event needs
--   none and everything that orders or splits events by time works as before.

alter table public.events
  add column status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  add column image_alt text,
  add column tags text[] not null default '{}',
  add column online_url text check (online_url is null or online_url ~ '^https?://'),
  add column sessions jsonb not null default '[]' check (jsonb_typeof(sessions) = 'array');
