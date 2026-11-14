-- A page can show a different menu in the header than the rest of the site.
--
-- pages.header_menu: the id of one of the site's menus (site_chrome.navigation.menus), shown
--   across the top on that page and on the pages under it that don't pick their own. Null
--   (the default) keeps the menu the Header's "Main menu" location was given. A menu that's
--   since been removed reads as null.

alter table public.pages
  add column header_menu text check (header_menu is null or header_menu ~ '^[a-z0-9][a-z0-9-]{0,59}$');
