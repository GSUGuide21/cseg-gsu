/** Something the site's search can find */
export interface SearchEntry {
  title: string
  href: string
  /** What it is, said beside the result: "Post" */
  kind: string
  summary?: string | null
  /** All of its words */
  text?: string
}

export interface SearchResult extends Omit<SearchEntry, 'text'> {
  /** A few words around the first match, or its summary */
  snippet: string
}

const SNIPPET = 160

const clean = (text: string) => text.replace(/\s+/g, ' ').trim()

/** The words around a match, on word boundaries */
const around = (text: string, at: number) => {
  const start = Math.max(0, text.lastIndexOf(' ', Math.max(0, at - 50)) + 1)
  const cut = text.slice(start, start + SNIPPET)
  const end = start + SNIPPET < text.length ? cut.replace(/\s+\S*$/, '') : cut
  return `${start > 0 ? '…' : ''}${end}${start + SNIPPET < text.length ? '…' : ''}`
}

/**
 * What matches a search, best first. Every word has to appear somewhere; a word in the title
 * counts for more than one in the summary, and that for more than one in the text.
 */
export const searchContent = (entries: readonly SearchEntry[], query: string, limit = 30): SearchResult[] => {
  const words = clean(query).toLowerCase().split(' ').filter(Boolean)
  if (!words.length) return []
  const scored = entries.flatMap((entry) => {
    const title = entry.title.toLowerCase()
    const summary = (entry.summary ?? '').toLowerCase()
    const text = clean(entry.text ?? '')
    const lower = text.toLowerCase()
    let score = title === words.join(' ') ? 20 : 0
    for (const word of words) {
      const points = (title.includes(word) ? 10 : 0) + (summary.includes(word) ? 4 : 0) + (lower.includes(word) ? 1 : 0)
      if (!points) return []
      score += points
    }
    const hit = words.map((w) => lower.indexOf(w)).find((i) => i >= 0) ?? -1
    const snippet = summary && words.some((w) => summary.includes(w)) ? clean(entry.summary!) : hit >= 0 ? around(text, hit) : clean(entry.summary ?? '') || text.slice(0, SNIPPET)
    return [{ score, result: { title: entry.title, href: entry.href, kind: entry.kind, summary: entry.summary, snippet } }]
  })
  return scored
    .sort((a, b) => b.score - a.score || a.result.title.localeCompare(b.result.title))
    .slice(0, limit)
    .map((s) => s.result)
}
