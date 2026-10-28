/**
 * A link target that's safe to put in an href, or null: http(s), mailto, tel, a path on
 * this site, or a #section. Anything else (javascript:, data:, a protocol-relative
 * //elsewhere) is turned away. Used wherever officers' writing becomes links.
 */
export const safeHref = (url: string) => {
  const u = url.trim()
  if (u.startsWith('/') && !u.startsWith('//') && !u.startsWith('/\\')) return u
  if (u.startsWith('#')) return u
  return /^(https?:|mailto:|tel:)/i.test(u) ? u : null
}

/** A link someone typed, made safe as above; a bare "gsu.edu" or "gsu.edu/page" gets https:// in front */
export const linkFromInput = (typed: string) => {
  const t = typed.trim()
  return safeHref(/^[\w-]+(\.[\w-]+)+(\/|$)/.test(t) ? `https://${t}` : t)
}

/** An image source that's safe: https, or a path on this site */
export const safeSrc = (url: string) => {
  const u = url.trim()
  return /^https:\/\//i.test(u) || (u.startsWith('/') && !u.startsWith('//')) ? u : null
}
