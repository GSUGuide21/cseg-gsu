/** Something the site's search (or the dashboard's) can find */
export interface SearchEntry {
  title: string
  href: string
  /** What it is, said beside the result and used to group results: "Post" */
  kind: string
  summary?: string | null
  /** All of its words */
  text?: string
  /** A picture for it: a post's cover, an event's flyer, an album's first photo */
  image?: string | null
  /** When it is or was: an event's start, a post's date (ISO) */
  date?: string | null
  /** A short line of detail: where it is, its status, who it's from */
  meta?: string | null
  /** Other words it goes by (a building's nicknames), matched almost as strongly as its title */
  keywords?: readonly string[]
  /** An icon by name, for one that needs its own (a social network's): "instagram" */
  icon?: string | null
}

export interface SearchResult extends Omit<SearchEntry, 'text' | 'keywords'> {
  /** A few words around the first match, or its summary */
  snippet: string
}

export interface SearchOptions {
  /** How many to give back. Default 30. */
  limit?: number
  /** Points added to a kind's results, to lift (or lower) them in a tie: { Page: 4 } */
  boost?: Readonly<Record<string, number>>
  /** Only this kind's results (the counts still cover every kind) */
  kind?: string | null
}

/** What a search finds: the best matches, how many matched in all, and how many of each kind */
export interface SearchFound {
  results: SearchResult[]
  total: number
  kinds: Record<string, number>
}

const SNIPPET = 160

/** An entry as it's shown: everything but the words it's found by, with its summary as the words shown */
export const asResult = (entry: SearchEntry, snippet = entry.summary ?? ''): SearchResult => ({
  title: entry.title,
  href: entry.href,
  kind: entry.kind,
  summary: entry.summary,
  image: entry.image,
  date: entry.date,
  meta: entry.meta,
  icon: entry.icon,
  snippet: snippet.replace(/\s+/g, ' ').trim(),
})

const clean = (text: string) => text.replace(/\s+/g, ' ').trim()

/** Text as plain lowercase letters: accents and curly quotes taken off, so "Café" and "cafe" match */
const fold = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘]/g, "'")
    .toLowerCase()

/** The words of a piece of text: letters and digits, apostrophes dropped ("Shah's" is "shahs") */
const tokens = (text: string) => fold(text).replace(/'/g, '').match(/[a-z0-9]+/g) ?? []

/** The words of a search, each once */
export const searchWords = (query: string) => [...new Set(tokens(query))]

/** A word with a plural's or possessive's ending taken off: "students" and "student", "classes" and "class" */
const stem = (word: string) => (word.length > 4 && /(ches|shes|sses|xes)$/.test(word) ? word.slice(0, -2) : word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word)

/** How many single-letter changes (a letter added, dropped, changed, or two swapped) turn one word into the other, up to `max` */
const distance = (a: string, b: string, max: number) => {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let before = Array.from({ length: b.length + 1 }, (_, j) => j)
  let prev: number[] = before
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let d = Math.min(before[j] + 1, row[j - 1] + 1, before[j - 1] + cost)
      // Two letters swapped ("teh") is one change
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev[j - 2] + 1)
      row.push(d)
      best = Math.min(best, d)
    }
    if (best > max) return max + 1
    prev = before
    before = row
  }
  return before[b.length]
}

/** How many changes a word of this length may have and still count: none for short words, one, then two for long ones */
const allowed = (word: string) => (word.length >= 8 ? 2 : word.length >= 4 ? 1 : 0)

/**
 * How well a searched word matches one word of the text, from 0 (not at all) to 1: the same
 * word; the same once plurals are set aside; the start of it ("lib", for library); or, for a
 * longer word, near enough to be a typo ("resorces"). Never the middle of a word: "eat" isn't
 * found in "creative".
 */
const wordMatch = (q: string, word: string) => {
  if (word === q) return 1
  if (stem(word) === stem(q)) return 0.95
  if (q.length >= 2 && word.startsWith(q)) return q.length >= 3 ? 0.8 : 0.5
  const max = allowed(q)
  if (!max || word.length < 3) return 0
  // A typo in the whole word, or in the start of a longer one ("financ" for "financial")
  if (distance(q, word, max) <= max) return 0.6
  if (word.length > q.length && distance(q, word.slice(0, q.length), max) <= max && q.length >= 5) return 0.45
  return 0
}

/** The best a searched word does against a field's words */
const fieldMatch = (q: string, words: readonly string[]) => {
  let best = 0
  for (const w of words) {
    const m = wordMatch(q, w)
    if (m > best) best = m
    if (best === 1) break
  }
  return best
}

const WEIGHTS = { title: 10, keywords: 7, summary: 4, meta: 4, text: 1 } as const

/** The words around a match, on word boundaries */
const around = (text: string, at: number) => {
  const start = Math.max(0, text.lastIndexOf(' ', Math.max(0, at - 50)) + 1)
  const cut = text.slice(start, start + SNIPPET)
  const end = start + SNIPPET < text.length ? cut.replace(/\s+\S*$/, '') : cut
  return `${start > 0 ? '…' : ''}${end}${start + SNIPPET < text.length ? '…' : ''}`
}

/** Where in a text the first word matching any searched word starts, or -1 */
const firstMatchAt = (text: string, words: readonly string[]) => {
  const pattern = /[\p{L}\p{N}’']+/gu
  for (let m = pattern.exec(text); m; m = pattern.exec(text)) {
    const word = tokens(m[0]).join('')
    if (word && words.some((q) => wordMatch(q, word) > 0)) return m.index
  }
  return -1
}

/**
 * What matches a search, best first, how many matched in all, and how many of each kind. Every searched word has
 * to match a word somewhere (see wordMatch). A match in the title counts most, then in the
 * other names, then the summary and detail line, then the text; a whole title matching, or
 * the words appearing together in it, counts extra. `boost` lifts a kind (the site's own
 * pages, say) above others that match as well.
 */
export const searchWithTotal = (entries: readonly SearchEntry[], query: string, options: SearchOptions = {}): SearchFound => {
  const { limit = 30, boost = {}, kind = null } = options
  const words = searchWords(query)
  if (!words.length) return { results: [], total: 0, kinds: {} }
  const phrase = words.join(' ')
  const scored = entries.flatMap((entry) => {
    const fields = {
      title: tokens(entry.title),
      keywords: tokens((entry.keywords ?? []).join(' ')),
      summary: tokens(entry.summary ?? ''),
      meta: tokens(entry.meta ?? ''),
      text: tokens(entry.text ?? ''),
    }
    let score = 0
    let inTitle = 0
    for (const q of words) {
      let best = 0
      for (const field of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
        const points = WEIGHTS[field] * fieldMatch(q, fields[field])
        if (points > best) best = points
        // The word itself (or its plural) is in the title: a word that only starts with it ("joint", for "join") isn't
        if (field === 'title' && points >= WEIGHTS.title * 0.95) inTitle++
      }
      if (!best) return []
      score += best
    }
    const title = fields.title.join(' ')
    // Words typed apart that are one word in the title ("panther card", "panthr card" for PantherCard)
    if (words.length > 1 && fieldMatch(words.join(''), fields.title) >= 0.6) score += 15
    if (title === phrase) score += 20
    else if (title.startsWith(phrase)) score += 8
    else if (words.length > 1 && title.includes(phrase)) score += 5
    if (inTitle === words.length) score += 6
    score += boost[entry.kind] ?? 0

    const text = clean(entry.text ?? '')
    const summary = clean(entry.summary ?? '')
    const summaryHit = summary ? firstMatchAt(summary, words) : -1
    const hit = summaryHit < 0 && text ? firstMatchAt(text, words) : -1
    const snippet = summaryHit >= 0 || !text ? summary || text.slice(0, SNIPPET) : hit >= 0 ? around(text, hit) : summary || text.slice(0, SNIPPET)
    return [{ score, result: asResult(entry, snippet) }]
  })
  scored.sort((a, b) => b.score - a.score || a.result.title.length - b.result.title.length || a.result.title.localeCompare(b.result.title))
  const kinds: Record<string, number> = {}
  for (const s of scored) kinds[s.result.kind] = (kinds[s.result.kind] ?? 0) + 1
  const picked = kind ? scored.filter((s) => s.result.kind === kind) : scored
  return { results: picked.slice(0, limit).map((s) => s.result), total: picked.length, kinds }
}

/** What matches a search, best first (see searchWithTotal) */
export const searchContent = (entries: readonly SearchEntry[], query: string, limitOrOptions: number | SearchOptions = 30): SearchResult[] =>
  searchWithTotal(entries, query, typeof limitOrOptions === 'number' ? { limit: limitOrOptions } : limitOrOptions).results

/**
 * Results under their kinds, in the order given (kinds not in it follow, in the order they
 * first appear), each kind keeping its results best first
 */
export const groupResults = <R extends { kind: string }>(results: readonly R[], order: readonly string[] = []): { kind: string; results: R[] }[] => {
  const groups = new Map<string, R[]>()
  for (const r of results) groups.set(r.kind, [...(groups.get(r.kind) ?? []), r])
  const rank = (kind: string) => {
    const at = order.indexOf(kind)
    return at < 0 ? order.length : at
  }
  return [...groups].map(([kind, rs]) => ({ kind, results: rs })).sort((a, b) => rank(a.kind) - rank(b.kind))
}

/**
 * A piece of text cut where it matches the search, to mark it: each part says whether it
 * matched. Only whole words (or their starts) are marked, as the search finds them: a word
 * matched by its start has that start marked; one matched as a plural or a typo, all of it.
 */
export const markMatches = (text: string, words: readonly string[]): { text: string; match: boolean }[] => {
  const searched = words.flatMap((w) => tokens(w))
  if (!searched.length || !text) return [{ text, match: false }]
  const parts: { text: string; match: boolean }[] = []
  const push = (t: string, match: boolean) => {
    if (!t) return
    const last = parts[parts.length - 1]
    if (last && last.match === match) last.text += t
    else parts.push({ text: t, match })
  }
  let at = 0
  const pattern = /[\p{L}\p{N}’']+/gu
  for (let m = pattern.exec(text); m; m = pattern.exec(text)) {
    const raw = m[0]
    const word = tokens(raw).join('')
    let marked = 0
    for (const q of searched) {
      const how = wordMatch(q, word)
      if (!how) continue
      // Matched by its start: mark that much of it; otherwise the whole word
      const length = how === 0.8 || how === 0.5 ? q.length : raw.length
      marked = Math.max(marked, Math.min(raw.length, length))
    }
    if (!marked) continue
    push(text.slice(at, m.index), false)
    push(raw.slice(0, marked), true)
    push(raw.slice(marked), false)
    at = m.index + raw.length
  }
  push(text.slice(at), false)
  return parts.length ? parts : [{ text, match: false }]
}
