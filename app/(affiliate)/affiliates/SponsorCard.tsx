/* eslint-disable @next/next/no-img-element -- logos come at any size, from Storage or public/ */
import { ArrowUpRight } from 'lucide-react'
import type { FC } from 'react'

import { card, cardText, eyebrow } from '@/globals/ui/styles'
import { SPONSOR_TIER_LABELS } from '@/lib/dashboard/terms'
import type { SponsorRow } from '@/lib/supabase/types'

/** One sponsor: its logo (or its initial), its tier, a line about it, and its link */
export const SponsorCard: FC<{ sponsor: SponsorRow }> = ({ sponsor: s }) => (
  <article className={card({ padded: true, className: 'relative flex flex-col gap-3' })}>
    <div className="flex items-center gap-3">
      {s.logo_url ? (
        <img src={s.logo_url} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-line" />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-tint text-[1.2rem] font-extrabold text-brand" aria-hidden>
          {s.name.trim()[0]?.toUpperCase()}
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className={eyebrow}>{SPONSOR_TIER_LABELS[s.tier]}</p>
        <h3 className="text-[1.05rem] font-bold text-ink [overflow-wrap:anywhere]">{s.name}</h3>
      </div>
    </div>
    {s.blurb ? <p className={cardText}>{s.blurb}</p> : null}
    {s.href ? (
      <a
        href={s.href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto inline-flex w-fit items-center gap-1 text-[0.9rem] font-semibold text-brand no-underline after:absolute after:inset-0 after:rounded-[inherit] hover:underline"
      >
        Visit {s.name}
        <ArrowUpRight size={15} aria-hidden />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    ) : null}
  </article>
)
