-- The campus map's own places (buildings, study spots, MARTA, parking…) live in map_places
-- alongside the club's pins, so officers can fix them in the dashboard.
--
-- slug: a built-in place's map id (/map?place=student-center-east), kept so links, routes,
--   tours, and eateries' and resources' place_id keep pointing at it. Null for the club's own
--   pins, which the map ids club-<id>. Once any row has one, the map shows these in place of
--   its built-in list (scripts/seed-places.ts copies that list here).
-- aliases: extra search terms (abbreviations, nicknames).
-- also_in: other categories it's listed under; its pin's color follows category.

alter table public.map_places
  add column slug text unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add column aliases text[] not null default '{}',
  add column also_in text[] not null default '{}';
