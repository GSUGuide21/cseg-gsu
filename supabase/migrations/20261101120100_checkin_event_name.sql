-- Keeps each event's name on its check-ins. PIN stops listing an event once it ends, so
-- without this a member's history couldn't say what they came to.
--
-- Check-ins from before this have no name; past events listed in the site's code are still
-- found by their id, and the rest show by date.

alter table public.event_checkins add column event_name text;
