-- Every saved version of each page and post, so an officer can look back and restore one.
--
-- A trigger records the row as it was saved (insert or update), with who saved it; a save
-- that changes nothing isn't recorded. The newest 50 per page or post are kept, and they go
-- when it's deleted. Officers read them; only the trigger writes them.

-- So the citext type below is found while this migration runs (it's in extensions)
set search_path = public, extensions;

create table public.page_revisions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  -- The page's columns as saved, less id and timestamps
  snapshot jsonb not null,
  saved_by citext,
  saved_at timestamptz not null default now()
);

create table public.post_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  snapshot jsonb not null,
  saved_by citext,
  saved_at timestamptz not null default now()
);

create index page_revisions_page on public.page_revisions (page_id, saved_at desc);
create index post_revisions_post on public.post_revisions (post_id, saved_at desc);

alter table public.page_revisions enable row level security;
alter table public.post_revisions enable row level security;
create policy "Officers read page revisions" on public.page_revisions for select using (public.is_officer());
create policy "Officers read post revisions" on public.post_revisions for select using (public.is_officer());

-- security definer: officers can't write revisions themselves, only by saving
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
  else
    insert into public.post_revisions (post_id, snapshot, saved_by) values (new.id, snap, public.current_email());
    delete from public.post_revisions where post_id = new.id and id not in (
      select id from public.post_revisions where post_id = new.id order by saved_at desc limit 50);
  end if;
  return null;
end $$;

create trigger pages_revision after insert or update on public.pages for each row execute function public.record_revision();
create trigger posts_revision after insert or update on public.posts for each row execute function public.record_revision();

-- What's there now counts as the first version of each
insert into public.page_revisions (page_id, snapshot, saved_by, saved_at)
  select id, to_jsonb(p) - 'id' - 'created_at' - 'updated_at', updated_by, updated_at from public.pages p;
insert into public.post_revisions (post_id, snapshot, saved_by, saved_at)
  select id, to_jsonb(p) - 'id' - 'created_at' - 'updated_at', author_email, updated_at from public.posts p;
