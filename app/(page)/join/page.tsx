import type { Metadata } from 'next'
import Link from 'next/link'

import { ManagedPage, managedPageMetadata } from '@/globals/Page/ManagedPage'
import { formatDollars, type ClubDetails } from '@/lib/clubDetails'
import { getClubDetails, getPublishedPage, pageMetadata } from '@/lib/dashboard/public'
import { SITE_PAGES } from '@/lib/sitePages'
import { JoinSteps, PageBlock, PageCallout, PageHeader } from '@/globals/Page'
import { button, card, pageShell } from '@/globals/ui/styles'

import { JoinForm } from './JoinForm'

/**
 * Asking to join from here, under the steps (or under the page officers wrote): the form
 * while the club is taking members, and a line saying so when it isn't. What dues cost
 * shows once officers set it in Settings.
 */
const RequestBlock = ({ details: { acceptingMembers, duesAmount, contactEmail } }: { details: ClubDetails }) => (
  <PageBlock
    id="request"
    title={acceptingMembers ? 'Ask to join' : 'Membership is closed for now'}
    description={
      acceptingMembers
        ? `Tell us who you are and an officer will add you to the roster.${duesAmount ? ` Dues are ${formatDollars(duesAmount)} a term, collected at a meeting.` : ''}`
        : undefined
    }
  >
    <div className="max-w-3xl">
      {acceptingMembers ? (
        <JoinForm contactEmail={contactEmail} />
      ) : (
        <p className={card({ padded: true, className: 'text-[0.95rem] leading-relaxed text-muted' })}>
          We aren’t taking new members right now. Events are still open to every Georgia State student, and you can{' '}
          <Link href="/contact" className="text-brand underline underline-offset-[0.15em]">
            write to the officers
          </Link>{' '}
          to hear when that changes.
        </p>
      )}
    </div>
  </PageBlock>
)

function JoinContent({ details }: { details: ClubDetails }) {
  const { meetingInfo, links } = details
  return (
    <div className={pageShell}>
      <PageHeader
        eyebrow="Join"
        title="Join CSEG"
        lead="Membership is open to every Georgia State student. No experience or application essay required, just a willingness to show up."
      >
        <a href={links.pin} className={button()} target="_blank" rel="noopener noreferrer">
          Join on PIN &rarr;
        </a>
        <Link href="/about#faq" className={button({ variant: 'outline' })}>
          Read the FAQ
        </Link>
      </PageHeader>

      <PageBlock title="How it works">
        <JoinSteps />
      </PageBlock>

      <RequestBlock details={details} />

      {meetingInfo ? (
        <PageBlock title="When and where we meet">
          <p className="text-[1.05rem] leading-relaxed whitespace-pre-line text-ink">{meetingInfo}</p>
        </PageBlock>
      ) : null}

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
  // Its page in the dashboard, while published; otherwise the tab title officers set (or the site's own)
  const meta = await pageMetadata('/join')
  return page ? managedPageMetadata(page, meta.description) : meta
}

/** The Join page officers wrote in the dashboard, once it's published; the one above until then */
export default async function JoinPage() {
  const [page, details] = await Promise.all([getPublishedPage('join'), getClubDetails()])
  return page ? <ManagedPage page={page} eyebrow={SITE_PAGES.join.eyebrow} after={<RequestBlock details={details} />} /> : <JoinContent details={details} />
}
