-- Presentations catch up with posts and pages: a schedule, a history of saves, and speaker notes.
--
-- publish_at / unpublish_at: as on posts, a published presentation shows from publish_at
--   (null: right away) until unpublish_at (null: for good). Outside that window only officers
--   see it. A private one stays with officers whatever its schedule.
-- presentation_revisions: every saved version (the newest 50), written by the same trigger
--   that keeps pages' and posts', so an officer can look back and restore one.
-- presentation_notes: each slide's speaker notes, { slide id: text }. They're kept apart from
--   the slides so that a published deck's notes never reach anyone but officers.

set search_path = public, extensions;

-- ── Schedule ────────────────────────────────────────────────────────────────

alter table public.presentations
  add column publish_at timestamptz,
  add column unpublish_at timestamptz,
  add constraint presentations_schedule_order check (publish_at is null or unpublish_at is null or unpublish_at > publish_at);

drop policy "Anyone reads published presentations" on public.presentations;
create policy "Anyone reads published presentations" on public.presentations for select using (
  (status = 'published' and visibility <> 'private' and (publish_at is null or publish_at <= now()) and (unpublish_at is null or unpublish_at > now()))
  or public.is_officer()
);

-- ── History ─────────────────────────────────────────────────────────────────

create table public.presentation_revisions (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  -- The presentation's columns as saved, less id and timestamps
  snapshot jsonb not null,
  saved_by citext,
  saved_at timestamptz not null default now()
);

create index presentation_revisions_presentation on public.presentation_revisions (presentation_id, saved_at desc);

alter table public.presentation_revisions enable row level security;
create policy "Officers read presentation revisions" on public.presentation_revisions for select using (public.is_officer());

-- The same function as before, now knowing presentations too
create or replace function public.record_revision() returns trigger
language plpgsql security definer set search_path = public, extensions
as $$
declare
  snap jsonb := to_jsonb(new) - 'id' - 'created_at' - 'updated_at';
begin
  if tg_op = 'UPDATE' and snap = to_jsonb(old) - 'id' - 'created_at' - 'updated_at' then
    return null;
  end if;
  if tg_table_name = 'pages' then
    insert into public.page_revisions (page_id, snapshot, saved_by) values (new.id, snap, public.current_email());
    delete from public.page_revisions where page_id = new.id and id not in (
      select id from public.page_revisions where page_id = new.id order by saved_at desc limit 50);
  elsif tg_table_name = 'presentations' then
    insert into public.presentation_revisions (presentation_id, snapshot, saved_by) values (new.id, snap, public.current_email());
    delete from public.presentation_revisions where presentation_id = new.id and id not in (
      select id from public.presentation_revisions where presentation_id = new.id order by saved_at desc limit 50);
  else
    insert into public.post_revisions (post_id, snapshot, saved_by) values (new.id, snap, public.current_email());
    delete from public.post_revisions where post_id = new.id and id not in (
      select id from public.post_revisions where post_id = new.id order by saved_at desc limit 50);
  end if;
  return null;
end $$;

create trigger presentations_revision after insert or update on public.presentations for each row execute function public.record_revision();

-- What's there now counts as the first version of each
insert into public.presentation_revisions (presentation_id, snapshot, saved_by, saved_at)
  select id, to_jsonb(p) - 'id' - 'created_at' - 'updated_at', updated_by, updated_at from public.presentations p;

-- ── Speaker notes ───────────────────────────────────────────────────────────

create table public.presentation_notes (
  presentation_id uuid primary key references public.presentations (id) on delete cascade,
  notes jsonb not null default '{}'::jsonb check (jsonb_typeof(notes) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.presentation_notes enable row level security;
create policy "Officers read presentation notes" on public.presentation_notes for select using (public.is_officer());
create policy "Officers write presentation notes" on public.presentation_notes for insert with check (public.is_officer());
create policy "Officers edit presentation notes" on public.presentation_notes for update using (public.is_officer());
create policy "Officers delete presentation notes" on public.presentation_notes for delete using (public.is_officer());

create trigger presentation_notes_touch before update on public.presentation_notes for each row execute function public.touch_updated_at();
