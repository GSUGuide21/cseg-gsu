import type { Metadata } from 'next'
import Link from 'next/link'

import { PageBlock, PageCallout, PageHeader } from '@/globals/Page'
import { button, grid2, grid3, pageShell } from '@/globals/ui/styles'
import { getAffiliates, getSponsors, pageMetadata } from '@/lib/dashboard/public'

import { AffiliateCard } from './AffiliateCard'
import { SponsorCard } from './SponsorCard'

export const generateMetadata = (): Promise<Metadata> => pageMetadata('/affiliates')

export const revalidate = 300

export default async function AffiliatesPage() {
  const [affiliates, sponsors] = await Promise.all([getAffiliates(), getSponsors()])
  return (
    <div className={pageShell}>
      <PageHeader
        eyebrow="About"
        title="Affiliates"
        lead="The student organizations CSEG partners with. Join CSEG and our affiliates to find even more ways to get involved at Georgia State."
      />

      <PageBlock title="Our affiliates">
        <div className={grid2}>
          {affiliates.map((a) => (
            <AffiliateCard key={a.slug} affiliate={a} />
          ))}
        </div>
      </PageBlock>

      {sponsors.length ? (
        <PageBlock id="sponsors" title="Our sponsors" description="The businesses and departments that help make CSEG’s events happen.">
          <div className={grid3}>
            {sponsors.map((s) => (
              <SponsorCard key={s.id} sponsor={s} />
            ))}
          </div>
        </PageBlock>
      ) : null}

      <PageCallout
        title="Want to partner with CSEG?"
        actions={
          <Link href="/contact" className={button({ variant: 'outline' })}>
            Contact us
          </Link>
        }
      >
        We collaborate with University departments, registered student organizations, and affiliated groups on events.
      </PageCallout>
    </div>
  )
}
