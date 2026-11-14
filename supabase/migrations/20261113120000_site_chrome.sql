-- What frames every page, edited in the dashboard (one row, a column for each part).
--
-- navigation: { menus: [{ id, name, links: [{ href, label, menu?: { description, links: [{ href, label, description? }] } }] }] }
-- header:     { menu, search, themeToggle, cta: { label, href } | null }                        menu: a menu's id
-- footer:     { columns: [menu id], bottom: menu id | null, cta: { shown, eyebrow, title, text, button } }
-- search:     { title, lead, placeholder, emptyTitle, emptyText, suggestions: [text] }
--
-- (app/lib/siteChrome.ts.) Each is empty until officers save it, and the site uses its
-- built-in copy for an empty part and for anything a saved one leaves out.

create table public.site_chrome (
  id smallint primary key default 1 check (id = 1),
  navigation jsonb not null default '{}'::jsonb check (jsonb_typeof(navigation) = 'object'),
  header jsonb not null default '{}'::jsonb check (jsonb_typeof(header) = 'object'),
  footer jsonb not null default '{}'::jsonb check (jsonb_typeof(footer) = 'object'),
  search jsonb not null default '{}'::jsonb check (jsonb_typeof(search) = 'object'),
  updated_at timestamptz not null default now(),
  -- citext lives in the extensions schema, which only the first migration put on its search path
  updated_by extensions.citext
);
insert into public.site_chrome (id) values (1);

alter table public.site_chrome enable row level security;
create policy "Anyone reads the site chrome" on public.site_chrome for select using (true);
create policy "Officers edit the site chrome" on public.site_chrome for update using (public.is_officer());

create trigger site_chrome_touch before update on public.site_chrome for each row execute function public.touch_updated_at();
