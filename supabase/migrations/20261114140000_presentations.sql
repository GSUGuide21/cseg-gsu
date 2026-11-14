-- Presentations: slide decks officers build in the dashboard, played at /presentations/its-address.
--
-- A third kind of content beside posts and pages. Each is a title, a line about it, and its
-- slides, in order: [{ id, title, body }], where body is the editor's JSON, as a post's is.
-- Published ones are public, like posts; drafts are for officers.
--
-- published_at: when it first went up (kept if it's taken down and put back).
-- author_name: who made it, as the site shows them; the officer list isn't public.
-- updated_by: who saved it last.

create table public.presentations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) > 0),
  description text,
  slides jsonb not null default '[]'::jsonb check (jsonb_typeof(slides) = 'array'),
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  author_email extensions.citext default public.current_email(),
  author_name text,
  updated_by extensions.citext default public.current_email(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.presentations enable row level security;
create policy "Anyone reads published presentations" on public.presentations for select using (status = 'published' or public.is_officer());
create policy "Officers write presentations" on public.presentations for insert with check (public.is_officer());
create policy "Officers edit presentations" on public.presentations for update using (public.is_officer());
create policy "Officers delete presentations" on public.presentations for delete using (public.is_officer());

create trigger presentations_touch before update on public.presentations for each row execute function public.touch_updated_at();
