-- Comments officers leave on a post's or page's writing, for each other, while it's being
-- written. Never shown on the site.
--
-- A thread is the comments on one stretch of the writing: the writing marks that stretch
-- with the thread's id (thread_id), and its first comment keeps the words it was on (quote),
-- so the thread still makes sense if they're edited away. Resolving a thread marks all of
-- its comments resolved.

create table public.document_comments (
  id uuid primary key default gen_random_uuid(),
  doc_kind text not null check (doc_kind in ('post', 'page')),
  doc_id uuid not null,
  thread_id text not null check (thread_id ~ '^[a-z0-9-]{8,64}$'),
  quote text check (quote is null or length(quote) <= 500),
  body text not null check (length(trim(body)) between 1 and 2000),
  -- citext lives in the extensions schema, which only the first migration put on its search path
  author_email extensions.citext not null default public.current_email(),
  author_name text check (author_name is null or length(author_name) <= 120),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index document_comments_doc_idx on public.document_comments (doc_kind, doc_id, created_at);

alter table public.document_comments enable row level security;
create policy "Officers read comments" on public.document_comments for select using (public.is_officer());
-- Each officer comments as themselves
create policy "Officers comment" on public.document_comments for insert with check (public.is_officer() and author_email = public.current_email());
-- Any officer can resolve or reopen a thread
create policy "Officers resolve comments" on public.document_comments for update using (public.is_officer());
-- A comment is taken back by whoever wrote it, or by an admin
create policy "Officers delete their comments" on public.document_comments for delete using (author_email = public.current_email() or public.is_admin());
