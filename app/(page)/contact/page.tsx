import { ArrowUpRight, Mail } from 'lucide-react'
import type { Metadata } from 'next'

import { ManagedPage, managedPageMetadata } from '@/globals/Page/ManagedPage'
import { instagramHandle, type ClubDetails } from '@/lib/clubDetails'
import { getClubDetails, getPublishedPage, pageMetadata } from '@/lib/dashboard/public'
import { SITE_PAGES } from '@/lib/sitePages'
import { PageBlock, PageHeader } from '@/globals/Page'
import type { SocialNetwork } from '@/globals/config/social'
import { SOCIAL_META } from '@/globals/config/socialMeta'
import { button, card, grid3, iconTile, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

import { ContactForm } from './ContactForm'

/** Writing to the officers from here, under the email card (or under the page officers wrote) */
const MessageBlock = ({ details: { contactEmail, contactReply } }: { details: ClubDetails }) => (
  <PageBlock id="message" title="Send us a message" description="It goes straight to the officers. We'll reply by email.">
    <div className="max-w-3xl">
      <ContactForm contactEmail={contactEmail} reply={contactReply} />
    </div>
  </PageBlock>
)

function ContactContent({ details }: { details: ClubDetails }) {
  const { contactEmail, instagramUrl, meetingInfo, links, contactFormOpen } = details
  const channels = (Object.keys(links) as SocialNetwork[]).filter((n) => links[n])
  const handles: Record<SocialNetwork, string> = {
    instagram: instagramHandle(instagramUrl),
    x: '@cseg_gsu',
    pin: 'Panther Involvement Network',
    groupme: 'Chat with members',
    linktree: 'Every CSEG link',
    discord: 'Chat with members',
    linkedin: 'Alumni and news',
    youtube: 'Recordings and recaps',
  }

  return (
    <div className={pageShell}>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        lead={contactFormOpen ? 'Questions, partnerships, or ideas for an event? Email the officers, or send a message from here.' : 'Questions, partnerships, or ideas for an event? Email the officers.'}
      />

      <a
        href={`mailto:${contactEmail}`}
        className={card({
          accent: true,
          className:
            'flex flex-wrap items-center gap-4 rounded-2xl p-[clamp(1.25rem,3vw,1.75rem)] text-ink no-underline transition-colors hover:border-brand focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand min-[560px]:flex-nowrap',
        })}
      >
        <span className={cn(iconTile, 'size-12')} aria-hidden>
          <Mail size={22} strokeWidth={2} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[0.8rem] text-muted">Email the officers</span>
          <span className="text-[clamp(1.05rem,2.5vw,1.35rem)] font-bold [overflow-wrap:anywhere]">{contactEmail}</span>
        </span>
        <span className={button({ className: 'w-full shrink-0 min-[560px]:w-auto' })} aria-hidden>
          Send email
        </span>
      </a>

      {contactFormOpen ? <MessageBlock details={details} /> : null}

      {meetingInfo ? (
        <PageBlock title="When and where we meet">
          <p className="text-[1.05rem] leading-relaxed whitespace-pre-line text-ink">{meetingInfo}</p>
        </PageBlock>
      ) : null}

      <PageBlock title="Find us online">
        <ul className={grid3}>
          {channels.map((network) => {
            const { label, Icon } = SOCIAL_META[network]
            return (
              <li key={network}>
                <a
                  href={links[network]}
                  className={card({
                    className:
                      'group flex h-full items-center gap-[0.9rem] px-5 py-[1.1rem] text-ink no-underline transition-colors hover:border-brand/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={iconTile} aria-hidden>
                    <Icon className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[1.05rem] font-bold">{label}</span>
                    <span className="truncate text-[0.85rem] text-muted">{handles[network]}</span>
                  </span>
                  <ArrowUpRight
                    className="shrink-0 text-muted transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand"
                    size={18}
                    aria-hidden
                  />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            )
          })}
        </ul>
      </PageBlock>
    </div>
  )
}

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage('contact')
  // Its page in the dashboard, while published; otherwise the tab title officers set (or the site's own)
  const meta = await pageMetadata('/contact')
  return page ? managedPageMetadata(page, meta.description) : meta
}

/** The Contact page officers wrote in the dashboard, once it's published; the one above until then */
export default async function ContactPage() {
  const [page, details] = await Promise.all([getPublishedPage('contact'), getClubDetails()])
  return page ? (
    <ManagedPage page={page} eyebrow={SITE_PAGES.contact.eyebrow} after={details.contactFormOpen ? <MessageBlock details={details} /> : undefined} />
  ) : (
    <ContactContent details={details} />
  )
}
