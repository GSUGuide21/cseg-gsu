import { ArrowUpRight, Mail } from 'lucide-react'
import type { Metadata } from 'next'

import { ManagedPage } from '@/globals/Page/ManagedPage'
import { getPublishedPage } from '@/lib/dashboard/public'
import { SITE_PAGES } from '@/lib/sitePages'
import { PageBlock, PageHeader } from '@/globals/Page'
import { CONTACT_EMAIL, SOCIAL_LINKS, type SocialNetwork } from '@/globals/config/social'
import { SOCIAL_META } from '@/globals/SocialIcons'
import { button, card, grid3, iconTile, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

const FALLBACK_METADATA: Metadata = {
  title: 'Contact',
  description: 'Reach the Campus Survival and Engagement Group by email or on social media.',
}

const DETAILS: Record<SocialNetwork, string> = {
  instagram: '@cseg_gsu',
  x: '@cseg_gsu',
  pin: 'Panther Involvement Network',
}

function ContactContent() {
  const channels = (Object.keys(SOCIAL_LINKS) as SocialNetwork[]).filter((n) => SOCIAL_LINKS[n])

  return (
    <div className={pageShell}>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        lead="Questions, partnerships, or ideas for an event? Email is the best way to reach the officers."
      />

      <a
        href={`mailto:${CONTACT_EMAIL}`}
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
          <span className="text-[clamp(1.05rem,2.5vw,1.35rem)] font-bold [overflow-wrap:anywhere]">{CONTACT_EMAIL}</span>
        </span>
        <span className={button({ className: 'w-full shrink-0 min-[560px]:w-auto' })} aria-hidden>
          Send email
        </span>
      </a>

      <PageBlock title="Find us online">
        <ul className={grid3}>
          {channels.map((network) => {
            const { label, Icon } = SOCIAL_META[network]
            return (
              <li key={network}>
                <a
                  href={SOCIAL_LINKS[network]}
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
                    <span className="truncate text-[0.85rem] text-muted">{DETAILS[network]}</span>
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
  return page ? { title: page.title, description: page.description ?? FALLBACK_METADATA.description } : FALLBACK_METADATA
}

/** The Contact page officers wrote in the dashboard, once it's published; the one above until then */
export default async function ContactPage() {
  const page = await getPublishedPage('contact')
  return page ? <ManagedPage page={page} eyebrow={SITE_PAGES.contact.eyebrow} /> : <ContactContent />
}
