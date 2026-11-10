import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { FC } from 'react'

import { Wordmark, type WordmarkBrand } from '@/globals/Logo'
import { card, cardText } from '@/globals/ui/styles'
import { type Affiliate, affiliateHref, affiliateLogo } from '@/lib/data/affiliates'

/** An affiliate's wordmark: its two lines, beside its PIN logo */
export const affiliateBrand = (a: Affiliate): WordmarkBrand => ({ name: a.name, top: a.wordmark.top, bottom: a.wordmark.bottom, logoSrc: affiliateLogo(a) })

/** One affiliate in the list: its wordmark, what it is, and a link to its page */
export const AffiliateCard: FC<{ affiliate: Affiliate }> = ({ affiliate }) => (
  <article className={card({ padded: true, className: 'relative flex flex-col gap-4' })}>
    <Wordmark brand={affiliateBrand(affiliate)} href={null} className="self-start" />
    <p className={cardText}>{affiliate.summary ?? `Follow ${affiliate.shortName} on Instagram at @${affiliate.instagram}.`}</p>
    <Link
      href={affiliateHref(affiliate)}
      className="mt-auto inline-flex w-fit items-center gap-1 text-[0.9rem] font-semibold text-brand no-underline after:absolute after:inset-0 after:rounded-[inherit] hover:underline"
    >
      About {affiliate.shortName}
      <ArrowRight size={15} aria-hidden />
    </Link>
  </article>
)
