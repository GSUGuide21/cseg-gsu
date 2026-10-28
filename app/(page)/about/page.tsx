import { BookOpen, Footprints, GraduationCap, MapPinned, MessageCircleQuestion, type LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { ManagedPage } from '@/globals/Page/ManagedPage'
import { getPublishedPage } from '@/lib/dashboard/public'
import { SITE_PAGES } from '@/lib/sitePages'
import { Faq, type FaqItem, PageBlock, PageCallout, PageHeader } from '@/globals/Page'
import { CLUB_DESCRIPTION } from '@/globals/config/site'
import { SOCIAL_LINKS } from '@/globals/config/social'
import { button, card, cardText, grid2, iconTile, inlineLink, pageShell } from '@/globals/ui/styles'

const FALLBACK_METADATA: Metadata = {
  title: 'About',
  description: CLUB_DESCRIPTION.oneLiner,
}

/** The PIN purpose statement, broken into its parts. */
const FOCUS_AREAS: readonly { Icon: LucideIcon; title: string; body: string; link?: { href: string; label: string } }[] = [
  {
    Icon: MapPinned,
    title: 'Navigating campus',
    body: 'The social and physical sides of Georgia State: where things are, how they work, and how to find your place.',
  },
  {
    Icon: Footprints,
    title: 'Getting things done',
    body: 'Help with the necessary tasks for getting through college, so the paperwork and processes never hold you back.',
  },
  {
    Icon: BookOpen,
    title: 'Underutilized resources',
    body: 'GSU offers more support than most students ever use. We help you understand what is out there and how to use it.',
    link: { href: '/resources', label: 'Browse resources' },
  },
  {
    Icon: GraduationCap,
    title: 'Graduating',
    body: 'Everything we do points toward the finish line: helping Panthers stay on track all the way to graduation.',
  },
]

const FAQ: readonly FaqItem[] = [
  {
    q: 'Who can join?',
    a: 'Any Georgia State student. CSEG is open to every major and every year, whether you are brand new to campus or almost done.',
  },
  {
    q: 'Is CSEG only for freshmen?',
    a: 'No. New students get a lot out of CSEG, but transfer students, commuters, and upperclassmen are just as welcome, and experienced members help newer ones find their footing.',
  },
  {
    q: 'How do I join?',
    a: (
      <>
        Request membership on our{' '}
        <a href={SOCIAL_LINKS.pin} className={inlineLink} target="_blank" rel="noopener noreferrer">
          PIN page
        </a>
        , then come to an event. See{' '}
        <Link href="/join" className={inlineLink}>
          Join
        </Link>{' '}
        for details.
      </>
    ),
  },
  {
    q: 'How do I hear about events?',
    a: (
      <>
        Events are posted on{' '}
        <a href={SOCIAL_LINKS.pin} className={inlineLink} target="_blank" rel="noopener noreferrer">
          PIN
        </a>{' '}
        and announced on{' '}
        <a href={SOCIAL_LINKS.instagram} className={inlineLink} target="_blank" rel="noopener noreferrer">
          Instagram
        </a>
        .
      </>
    ),
  },
]

function AboutContent() {
  return (
    <div className={pageShell}>
      <PageHeader eyebrow="About" title="About CSEG" lead={CLUB_DESCRIPTION.short}>
        <Link href="/join" className={button()}>
          Join us
        </Link>
        <Link href="/events" className={button({ variant: 'outline' })}>
          See events &rarr;
        </Link>
      </PageHeader>

      <PageBlock title="Mission & purpose">
        <div className={grid2}>
          <article className={card({ padded: true })}>
            <h3 className="text-[1.05rem] font-bold text-ink">Mission</h3>
            <p className={cardText}>{CLUB_DESCRIPTION.mission}</p>
          </article>
          <article className={card({ padded: true })}>
            <h3 className="text-[1.05rem] font-bold text-ink">Purpose</h3>
            <p className={cardText}>{CLUB_DESCRIPTION.purpose}</p>
          </article>
        </div>
      </PageBlock>

      <PageBlock title="What we focus on" description="How CSEG helps Panthers from day one to graduation.">
        <div className={grid2}>
          {FOCUS_AREAS.map(({ Icon, title, body, link }) => (
            <article key={title} className={card({ padded: true })}>
              <span className={iconTile} aria-hidden>
                <Icon size={20} strokeWidth={2} />
              </span>
              <h3 className="text-[1.05rem] font-bold text-ink">{title}</h3>
              <p className={cardText}>{body}</p>
              {link ? (
                <Link href={link.href} className={`${inlineLink} text-[0.9rem] font-semibold`}>
                  {link.label} &rarr;
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </PageBlock>

      <PageBlock id="faq" title="Common questions">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
          <Faq items={FAQ} />
          <aside
            className={card({
              accent: true,
              className: 'flex flex-col gap-3 p-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]',
            })}
          >
            <span className={iconTile} aria-hidden>
              <MessageCircleQuestion size={20} strokeWidth={2} />
            </span>
            <h3 className="text-[1.05rem] font-bold text-ink">Still have questions?</h3>
            <p className="text-[0.95rem] leading-relaxed text-muted">
              Send the officers a message. We&apos;re happy to help.
            </p>
            <Link href="/contact" className={button({ size: 'sm', className: 'mt-1 self-start' })}>
              Contact us
            </Link>
          </aside>
        </div>
      </PageBlock>

      <PageCallout
        title="Ready to get involved?"
        actions={
          <Link href="/join" className={button()}>
            Join CSEG
          </Link>
        }
      >
        Every Panther is welcome. Come find your footing with us.
      </PageCallout>
    </div>
  )
}

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage('about')
  return page ? { title: page.title, description: page.description ?? FALLBACK_METADATA.description } : FALLBACK_METADATA
}

/** The About page officers wrote in the dashboard, once it's published; the one above until then */
export default async function AboutPage() {
  const page = await getPublishedPage('about')
  return page ? <ManagedPage page={page} eyebrow={SITE_PAGES.about.eyebrow} /> : <AboutContent />
}
