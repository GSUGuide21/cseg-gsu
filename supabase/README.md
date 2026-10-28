# Officer dashboard: Supabase setup

The dashboard at `/dashboard` keeps its data in Supabase (Postgres), and officers sign in
with Google through Supabase Auth. Until it's connected, `/login` shows these steps
instead of a sign-in button, and the public site works without it.

## 1. Create the project and the tables

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`migrations/20261027120000_dashboard.sql`](migrations/20261027120000_dashboard.sql)
   and then [`migrations/20261027180000_media.sql`](migrations/20261027180000_media.sql) (the
   bucket for uploaded images), or with the CLI: `npx supabase link --project-ref <ref>` and
   then `npx supabase db push`.
3. Add the first admin (SQL editor), with the Google account they'll sign in with:

   ```sql
   insert into public.officers (email, name, role, title)
   values ('name@student.gsu.edu', 'Their Name', 'admin', 'President');
   ```

   Admins add everyone else in **Dashboard → Settings → Officers**.

## 2. Turn on Google sign-in

1. In Google Cloud Console, create an OAuth client (type **Web application**). Add
   `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI.
2. In Supabase, go to **Authentication → Sign In / Providers → Google**, turn it on, and paste in the
   client ID and secret.
3. In **Authentication → URL Configuration**, set the Site URL to the live site and add
   `http://localhost:3000/auth/callback` and `https://<live site>/auth/callback` to the
   redirect URLs.

## 3. Connect the site

Add these to `.env.local` (and to the host's environment variables for production), then
restart `next dev`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

The publishable (or older "anon") key is meant to be public. Row-level security in the
migration decides what it can do: anyone can read published posts, pages, and map pins,
and only officers on the list can read or change anything else.

## What lives where

| Table | What it holds | Managed in |
| --- | --- | --- |
| `officers` | Who can sign in, and who's an admin | Settings |
| `members` | The club roster | Members |
| `event_checkins` | Who came to which event (events themselves come from PIN) | Events |
| `posts`, `pages` | Markdown shown at `/posts` and `/pages/<slug>` | Posts, Pages |
| `map_places` | The club's own pins on `/map` | Map |
| `club_settings` | Tagline, meeting info, contact links | Settings |
| `activity` | The Overview's "recent activity" feed | (written automatically) |
| Storage: `media` | Images uploaded for posts and pages (JPG, PNG, GIF, WebP, AVIF; up to 5 MB). Anyone can view them; only officers can upload. | Posts, Pages (the editor's Image tool, and cover images) |

After changing the schema, regenerate the types with
`npx supabase gen types typescript --linked` and update `app/lib/supabase/types.ts`.
