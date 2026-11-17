-- How a presentation looks and plays.
--
-- settings: { theme, transition, autoplay }: the deck's colours (the site's own, light, dark,
--   GSU blue, or paper), how one slide gives way to the next (none, fade, slide), and how many
--   seconds each slide stays up when the deck plays by itself (0: it doesn't).
-- Each slide's own layout, picture, and whether it's hidden from the show are kept with the
--   slide, in `slides`, so they need nothing here.

alter table public.presentations
  add column settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object');
