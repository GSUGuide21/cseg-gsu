/** Longest a slug gets; web addresses past this are hard to read or share */
export const SLUG_MAX = 80

/**
 * Text as a web address part: lowercase letters, numbers, and single hyphens.
 * "Fall Social 2026!" → "fall-social-2026"; "Café — Résumé" → "cafe-resume".
 *
 * `trailing` keeps a hyphen at the end, for while someone's still typing ("fall-").
 */
export const slugify = (s: string, { trailing = false } = {}) => {
  const slug = s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, SLUG_MAX)
  return trailing ? slug : slug.replace(/-+$/, '')
}
