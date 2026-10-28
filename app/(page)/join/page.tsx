import type { Metadata } from 'next'
import Link from 'next/link'

import { ManagedPage } from '@/globals/Page/ManagedPage'
import { getPublishedPage } from '@/lib/dashboard/public'
import { SITE_PAGES } from '@/lib/sitePages'
import { JoinSteps, PageBlock, PageCallout, PageHeader } from '@/globals/Page'
import { SOCIAL_LINKS } from '@/globals/config/social'
import { button, pageShell } from '@/globals/ui/styles'

const FALLBACK_METADATA: Metadata = {
  title: 'Join',
  description: 'How to become a member of the Campus Survival and Engagement Group at Georgia State.',
}

function JoinContent() {
  return (
    <div className={pageShell}>
      <PageHeader
        eyebrow="Join"
        title="Join CSEG"
        lead="Membership is open to every Georgia State student. No experience or application essay required, just a willingness to show up."
      >
        <a href={SOCIAL_LINKS.pin} className={button()} target="_blank" rel="noopener noreferrer">
          Join on PIN &rarr;
        </a>
        <Link href="/about#faq" className={button({ variant: 'outline' })}>
          Read the FAQ
        </Link>
      </PageHeader>

      <PageBlock title="How it works">
        <JoinSteps />
      </PageBlock>

      <PageCallout
        title="Questions before you join?"
        actions={
          <Link href="/contact" className={button({ variant: 'outline' })}>
            Contact us
          </Link>
        }
      >
        Reach out to the officers and we&apos;ll get back to you.
      </PageCallout>
    </div>
  )
}

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage('join')
  return page ? { title: page.title, description: page.description ?? FALLBACK_METADATA.description } : FALLBACK_METADATA
}

/** The Join page officers wrote in the dashboard, once it's published; the one above until then */
export default async function JoinPage() {
  const page = await getPublishedPage('join')
  return page ? <ManagedPage page={page} eyebrow={SITE_PAGES.join.eyebrow} /> : <JoinContent />
}
