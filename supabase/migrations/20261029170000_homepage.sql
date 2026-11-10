-- The homepage's words, edited in the dashboard (one row).
--
-- content: { hero: { eyebrow, title, lead, primary: { label, href }, secondary },
--   sections: [{ id, shown, eyebrow, title, lead, cta, quietTitle?, quietLead? }] }, the
--   sections in the page's order (app/lib/homepage.ts). Empty until officers save it, and
--   the site uses its built-in words for anything it leaves out.

create table public.homepage (
  id smallint primary key default 1 check (id = 1),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  updated_at timestamptz not null default now(),
  -- citext lives in the extensions schema, which only the first migration put on its search path
  updated_by extensions.citext
);
insert into public.homepage (id) values (1);

alter table public.homepage enable row level security;
create policy "Anyone reads the homepage" on public.homepage for select using (true);
create policy "Officers edit the homepage" on public.homepage for update using (public.is_officer());

create trigger homepage_touch before update on public.homepage for each row execute function public.touch_updated_at();
