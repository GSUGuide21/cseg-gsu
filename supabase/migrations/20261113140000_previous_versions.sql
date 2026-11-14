-- A way back from a save: the homepage, and each part of what frames the site (its menus,
-- header, footer, and search page), keep the version from before the last save, so an
-- officer can bring it back.
--
-- homepage.previous_content: what content was before the last save; null until the first one.
-- site_chrome.previous: { navigation?, header?, footer?, search? }, each part as it was
--   before that part's last save.

alter table public.homepage add column previous_content jsonb;
alter table public.site_chrome add column previous jsonb not null default '{}'::jsonb check (jsonb_typeof(previous) = 'object');
