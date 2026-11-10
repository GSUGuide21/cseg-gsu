-- Student resources, edited in the dashboard: the /resources page's links, References to
-- them on any page, and their groups (Academics & careers, Money & aid, … Group chats).
--
-- resource_groups: slug is the group's #link (/resources#money) and what References point
--   at, so it stays put when renamed. icon is one of the card icons (book, money, chat, …).
-- resources: slug is what References point at, made from its first name and kept.
--   place_id is the map place it's in, for "Show on map".
-- `npm run resources:seed` copies the site's built-in list into both.

create table public.resource_groups (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) > 0),
  description text,
  icon text not null default '',
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  group_slug text not null references public.resource_groups (slug) on delete restrict,
  label text not null check (length(trim(label)) > 0),
  href text not null check (href ~ '^(https?://|mailto:|tel:|/)'),
  description text not null default '',
  place_id text,
  sort integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resources_group_sort on public.resources (group_slug, sort);

alter table public.resource_groups enable row level security;
create policy "Anyone reads resource groups" on public.resource_groups for select using (true);
create policy "Officers add resource groups" on public.resource_groups for insert with check (public.is_officer());
create policy "Officers edit resource groups" on public.resource_groups for update using (public.is_officer());
create policy "Officers delete resource groups" on public.resource_groups for delete using (public.is_officer());

alter table public.resources enable row level security;
create policy "Anyone reads published resources" on public.resources for select using (published or public.is_officer());
create policy "Officers add resources" on public.resources for insert with check (public.is_officer());
create policy "Officers edit resources" on public.resources for update using (public.is_officer());
create policy "Officers delete resources" on public.resources for delete using (public.is_officer());

create trigger resource_groups_touch before update on public.resource_groups for each row execute function public.touch_updated_at();
create trigger resources_touch before update on public.resources for each row execute function public.touch_updated_at();
