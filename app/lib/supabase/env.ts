/**
 * The project's URL and public key, or null until they're set in .env.local:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
 *
 * The key may also go by NEXT_PUBLIC_SUPABASE_PUBLIC_KEY, or the older ANON_KEY. It's
 * safe in the browser: row-level security decides what it can do. Each name is read
 * spelled out in full, so Next can build the value into browser code. Without them, the
 * dashboard shows setup steps and public pages show nothing extra.
 */
export const supabaseEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key ? { url, key } : null
}
