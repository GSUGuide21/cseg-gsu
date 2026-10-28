-- How a page is laid out, its sections, and the line under its title.
--
-- layout: 'document' is one piece of writing (body, as before); 'sections' is a list of
-- sections, each with its own title, subtitle, and writing, drawn as the site's own pages
-- are. Each layout keeps its own content, so switching back and forth loses nothing.
-- sections: [{ id, title, subtitle, body }], body being editor JSON like pages.body.
-- subtitle: shown under the page title. Left empty, the description shows there instead
-- (which is what every page did before), so existing pages look the same.

alter table public.pages
  add column layout text not null default 'document' check (layout in ('document', 'sections')),
  add column sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  add column subtitle text;
