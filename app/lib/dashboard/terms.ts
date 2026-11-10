import type { DuesMethod, DuesPaymentRow, SponsorRow, SponsorTier, TermRow } from '@/lib/supabase/types'

type TermDates = Pick<TermRow, 'id' | 'starts_on' | 'ends_on'>

/**
 * The term today falls in. Between terms, the one that ended most recently (so a break still
 * counts toward the semester just finished); before the first, the one coming up; null if
 * there are none. Dates are "YYYY-MM-DD", so they compare as text.
 */
export const currentTerm = <T extends TermDates>(terms: readonly T[], today: string): T | null => {
  const within = terms.find((t) => t.starts_on <= today && today <= t.ends_on)
  if (within) return within
  const ended = terms.filter((t) => t.ends_on < today).sort((a, b) => b.ends_on.localeCompare(a.ends_on))
  if (ended.length) return ended[0]
  return [...terms].sort((a, b) => a.starts_on.localeCompare(b.starts_on))[0] ?? null
}

/** Whether a timestamp or date falls in a term (by its first ten characters, its day) */
export const inTerm = (term: Pick<TermRow, 'starts_on' | 'ends_on'>, iso: string) => {
  const day = iso.slice(0, 10)
  return term.starts_on <= day && day <= term.ends_on
}

/** Two terms can't share a day: the first other term these dates run into, or undefined */
export const overlappingTerm = <T extends TermDates>(terms: readonly T[], term: { id?: string | null; starts_on: string; ends_on: string }) =>
  terms.find((t) => t.id !== term.id && t.starts_on <= term.ends_on && term.starts_on <= t.ends_on)

export const DUES_METHOD_LABELS: Record<DuesMethod, string> = { cash: 'Cash', card: 'Card', transfer: 'Transfer', waived: 'Waived', other: 'Other' }

/** A term's dues at a glance: who's paid of those expected to, and what came in */
export const duesSummary = (memberIds: readonly string[], payments: readonly Pick<DuesPaymentRow, 'member_id' | 'amount' | 'method'>[]) => {
  const expected = new Set(memberIds)
  const paid = payments.filter((p) => expected.has(p.member_id))
  return {
    expected: expected.size,
    paid: paid.length,
    waived: paid.filter((p) => p.method === 'waived').length,
    collected: payments.reduce((sum, p) => sum + Number(p.amount), 0),
  }
}

export const SPONSOR_TIER_LABELS: Record<SponsorTier, string> = { presenting: 'Presenting sponsor', partner: 'Partner', supporter: 'Supporter' }
const TIER_ORDER: readonly SponsorTier[] = ['presenting', 'partner', 'supporter']

/** Whether a sponsor shows on a given day: inside its dates, either of which can be open */
export const sponsorActive = (s: Pick<SponsorRow, 'starts_on' | 'ends_on'>, today: string) => (!s.starts_on || s.starts_on <= today) && (!s.ends_on || today <= s.ends_on)

/** Sponsors as the site lists them: the highest tier first, then in the dashboard's order */
export const sortSponsors = <T extends Pick<SponsorRow, 'tier' | 'sort' | 'name'>>(sponsors: readonly T[]): T[] =>
  [...sponsors].sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.sort - b.sort || a.name.localeCompare(b.name))
