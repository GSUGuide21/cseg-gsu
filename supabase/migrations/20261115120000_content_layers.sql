-- Seven more kinds of content, each kept in the dashboard and shown on the site:
--
-- albums         - photos from an event or a term: [{ src, alt, caption }], at /albums/its-address.
-- tours          - the map's walking tours: stops in order, [{ placeId, title, why, tip }]. Until
--                  there's one here, the tours built into the site show.
-- documents      - the library at /library: files and links (flyers, forms, handouts), by category.
-- testimonials   - what members say about the club, shown on the Join page.
-- opportunities  - scholarships, jobs, internships, and volunteering, at /opportunities until
--                  their deadline passes.
-- polls          - polls and quizzes at /polls/its-address: questions, each with its options.
--   poll_keys      a quiz's right answers, kept apart so nobody can read them before answering.
--   poll_responses one per person (by a token in their browser); written only by
--                  submit_poll_response, which also marks a quiz.
-- forms          - forms officers build, at /forms/its-address: fields, each with a type.
--   form_responses what people sent; anyone can send to an open form, only officers read them.
--
-- Everything public is readable only once it's shown (published); officers read and write it all.

set search_path = public, extensions;

-- ── Albums ──────────────────────────────────────────────────────────────────

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) > 0),
  description text,
  taken_on date,
  cover_url text,
  photos jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array'),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Tours ───────────────────────────────────────────────────────────────────

create table public.tours (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) > 0),
  label text not null check (length(trim(label)) > 0),
  intro text not null default '',
  stops jsonb not null default '[]'::jsonb check (jsonb_typeof(stops) = 'array'),
  sort integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Library ─────────────────────────────────────────────────────────────────

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text,
  category text,
  url text not null,
  file_name text,
  sort integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Testimonials ────────────────────────────────────────────────────────────

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  role text,
  quote text not null check (length(trim(quote)) > 0),
  photo_url text,
  sort integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Opportunities ───────────────────────────────────────────────────────────

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  organization text,
  kind text not null default 'other' check (kind in ('scholarship', 'job', 'internship', 'volunteer', 'event', 'other')),
  description text,
  url text,
  location text,
  -- The last day to apply; null stays up until it's hidden
  deadline date,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Polls and quizzes ───────────────────────────────────────────────────────

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind text not null default 'poll' check (kind in ('poll', 'quiz')),
  title text not null check (length(trim(title)) > 0),
  description text,
  -- [{ id, text, options: [text] }]; an answer is the option's own words
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  published boolean not null default false,
  closes_at timestamptz,
  -- Whether people see how everyone answered once they have
  results_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.poll_keys (
  poll_id uuid primary key references public.polls (id) on delete cascade,
  -- { question id: the right option }
  correct jsonb not null default '{}'::jsonb check (jsonb_typeof(correct) = 'object')
);

create table public.poll_responses (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  voter text not null,
  -- { question id: the option picked }
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  -- A quiz's mark: how many were right
  score integer,
  created_at timestamptz not null default now(),
  unique (poll_id, voter)
);

create index poll_responses_poll on public.poll_responses (poll_id);

-- ── Forms ───────────────────────────────────────────────────────────────────

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) > 0),
  description text,
  -- [{ id, label, type, required, options: [text] }]
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  success_message text,
  published boolean not null default false,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  -- { field id: what was typed, or the options ticked }
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  created_at timestamptz not null default now()
);

create index form_responses_form on public.form_responses (form_id, created_at desc);

-- ── Who reads and writes what ───────────────────────────────────────────────

alter table public.albums enable row level security;
alter table public.tours enable row level security;
alter table public.documents enable row level security;
alter table public.testimonials enable row level security;
alter table public.opportunities enable row level security;
alter table public.polls enable row level security;
alter table public.poll_keys enable row level security;
alter table public.poll_responses enable row level security;
alter table public.forms enable row level security;
alter table public.form_responses enable row level security;

create policy "Anyone reads shown albums" on public.albums for select using (published or public.is_officer());
create policy "Officers add albums" on public.albums for insert with check (public.is_officer());
create policy "Officers edit albums" on public.albums for update using (public.is_officer());
create policy "Officers delete albums" on public.albums for delete using (public.is_officer());

create policy "Anyone reads shown tours" on public.tours for select using (published or public.is_officer());
create policy "Officers add tours" on public.tours for insert with check (public.is_officer());
create policy "Officers edit tours" on public.tours for update using (public.is_officer());
create policy "Officers delete tours" on public.tours for delete using (public.is_officer());

create policy "Anyone reads shown documents" on public.documents for select using (published or public.is_officer());
create policy "Officers add documents" on public.documents for insert with check (public.is_officer());
create policy "Officers edit documents" on public.documents for update using (public.is_officer());
create policy "Officers delete documents" on public.documents for delete using (public.is_officer());

create policy "Anyone reads shown testimonials" on public.testimonials for select using (published or public.is_officer());
create policy "Officers add testimonials" on public.testimonials for insert with check (public.is_officer());
create policy "Officers edit testimonials" on public.testimonials for update using (public.is_officer());
create policy "Officers delete testimonials" on public.testimonials for delete using (public.is_officer());

create policy "Anyone reads shown opportunities" on public.opportunities for select using (published or public.is_officer());
create policy "Officers add opportunities" on public.opportunities for insert with check (public.is_officer());
create policy "Officers edit opportunities" on public.opportunities for update using (public.is_officer());
create policy "Officers delete opportunities" on public.opportunities for delete using (public.is_officer());

create policy "Anyone reads shown polls" on public.polls for select using (published or public.is_officer());
create policy "Officers add polls" on public.polls for insert with check (public.is_officer());
create policy "Officers edit polls" on public.polls for update using (public.is_officer());
create policy "Officers delete polls" on public.polls for delete using (public.is_officer());

create policy "Officers read poll keys" on public.poll_keys for select using (public.is_officer());
create policy "Officers add poll keys" on public.poll_keys for insert with check (public.is_officer());
create policy "Officers edit poll keys" on public.poll_keys for update using (public.is_officer());
create policy "Officers delete poll keys" on public.poll_keys for delete using (public.is_officer());

-- Responses are written by submit_poll_response, below; nobody inserts them directly
create policy "Officers read poll responses" on public.poll_responses for select using (public.is_officer());
create policy "Officers delete poll responses" on public.poll_responses for delete using (public.is_officer());

create policy "Anyone reads shown forms" on public.forms for select using (published or public.is_officer());
create policy "Officers add forms" on public.forms for insert with check (public.is_officer());
create policy "Officers edit forms" on public.forms for update using (public.is_officer());
create policy "Officers delete forms" on public.forms for delete using (public.is_officer());

create policy "Anyone answers an open form" on public.form_responses for insert with check (
  exists (select 1 from public.forms f where f.id = form_id and f.published and (f.closes_at is null or f.closes_at > now()))
);
create policy "Officers read form responses" on public.form_responses for select using (public.is_officer());
create policy "Officers delete form responses" on public.form_responses for delete using (public.is_officer());

-- ── updated_at stays current ────────────────────────────────────────────────

create trigger albums_touch before update on public.albums for each row execute function public.touch_updated_at();
create trigger tours_touch before update on public.tours for each row execute function public.touch_updated_at();
create trigger documents_touch before update on public.documents for each row execute function public.touch_updated_at();
create trigger testimonials_touch before update on public.testimonials for each row execute function public.touch_updated_at();
create trigger opportunities_touch before update on public.opportunities for each row execute function public.touch_updated_at();
create trigger polls_touch before update on public.polls for each row execute function public.touch_updated_at();
create trigger forms_touch before update on public.forms for each row execute function public.touch_updated_at();

-- ── Answering a poll or quiz ────────────────────────────────────────────────

-- One answer per person per poll. For a quiz it marks the answers against the key and hands
-- back the mark and the right answers: only now, after they've answered.
create or replace function public.submit_poll_response(p_poll uuid, p_voter text, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  p public.polls;
  answer_key jsonb;
  marks integer;
begin
  select * into p from public.polls where id = p_poll;
  if p.id is null or not p.published then
    raise exception 'That isn''t open.' using errcode = 'P0001';
  end if;
  if p.closes_at is not null and p.closes_at <= now() then
    raise exception 'This has closed.' using errcode = 'P0001';
  end if;
  if length(coalesce(p_voter, '')) < 16 or p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'That answer couldn''t be read.' using errcode = 'P0001';
  end if;
  if p.kind = 'quiz' then
    select coalesce((select k.correct from public.poll_keys k where k.poll_id = p_poll), '{}'::jsonb) into answer_key;
    select count(*) into marks from jsonb_each_text(answer_key) right_one where p_answers ->> right_one.key = right_one.value;
  end if;
  begin
    insert into public.poll_responses (poll_id, voter, answers, score) values (p_poll, p_voter, p_answers, marks);
  exception when unique_violation then
    raise exception 'You''ve already answered this one.' using errcode = 'P0001';
  end;
  return jsonb_build_object('score', marks, 'correct', answer_key);
end $$;

-- How everyone answered: { total, counts: { question id: { option: how many } } }. For anyone
-- when the poll shares its results, and for officers always; otherwise null.
create or replace function public.poll_results(p_poll uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions
as $$
declare
  allowed boolean;
  total integer;
  counts jsonb;
begin
  select (published and results_public) or public.is_officer() into allowed from public.polls where id = p_poll;
  if not coalesce(allowed, false) then
    return null;
  end if;
  select count(*) into total from public.poll_responses where poll_id = p_poll;
  select coalesce(jsonb_object_agg(per_question.question, per_question.options), '{}'::jsonb) into counts
  from (
    select picked.question, jsonb_object_agg(picked.option, picked.n) as options
    from (
      select a.key as question, a.value as option, count(*) as n
      from public.poll_responses r cross join lateral jsonb_each_text(r.answers) a
      where r.poll_id = p_poll
      group by a.key, a.value
    ) picked
    group by picked.question
  ) per_question;
  return jsonb_build_object('total', total, 'counts', counts);
end $$;

revoke all on function public.submit_poll_response(uuid, text, jsonb) from public;
revoke all on function public.poll_results(uuid) from public;
grant execute on function public.submit_poll_response(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.poll_results(uuid) to anon, authenticated;
