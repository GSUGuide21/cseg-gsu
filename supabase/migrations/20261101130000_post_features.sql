-- More for posts, and a review step for posts and pages.
--
-- category, featured: how posts are grouped on /posts, and which is pinned to the top.
-- publish_at / unpublish_at: as on pages, a published post shows from publish_at (null: right
--   away) until unpublish_at (null: for good). Outside that window only officers see it, by
--   the same rule pages use, so a scheduled post can't be read early.
-- author_name: who wrote it, as readers see it. The officer list is private, so the name is
--   kept on the post instead of being looked up.
-- review_requested / review_note: a draft marked ready for another officer, and what they
--   should look at. Publishing clears both.

alter table public.posts
  add column category text,
  add column featured boolean not null default false,
  add column publish_at timestamptz,
  add column unpublish_at timestamptz,
  add column author_name text,
  add column review_requested boolean not null default false,
  add column review_note text,
  add constraint posts_schedule_order check (publish_at is null or unpublish_at is null or unpublish_at > publish_at);

alter table public.pages
  add column review_requested boolean not null default false,
  add column review_note text;

-- The name existing posts' authors go by today
update public.posts p set author_name = o.name from public.officers o where o.email = p.author_email and o.name is not null;

drop policy "Anyone reads published posts" on public.posts;
create policy "Anyone reads published posts" on public.posts for select using (
  (status = 'published' and (publish_at is null or publish_at <= now()) and (unpublish_at is null or unpublish_at > now()))
  or public.is_officer()
);
