import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FaDiscord, FaInstagram } from 'react-icons/fa6'

import { Wordmark } from '@/globals/Logo'
import { PageBlock, PageCallout } from '@/globals/Page'
import { SITE_SHORT_NAME } from '@/globals/config/site'
import { button, eyebrow, inlineLink, pageShell } from '@/globals/ui/styles'
import { getAffiliate, getAffiliates } from '@/lib/dashboard/public'
import { affiliateInstagram, affiliatePin } from '@/lib/data/affiliates'

import { affiliateBrand } from '../AffiliateCard'

type Props = { params: Promise<{ affiliate: string }> }

// Built ahead for each published affiliate; one added since is built on its first visit, and any other address is a 404
export const revalidate = 300

export const generateStaticParams = async () => (await getAffiliates()).map((a) => ({ affiliate: a.slug }))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const affiliate = await getAffiliate((await params).affiliate)
  if (!affiliate) return {}
  const description = affiliate.summary ?? `${affiliate.name}, a ${SITE_SHORT_NAME} affiliate at Georgia State.`
  return { title: affiliate.shortName, description, openGraph: { title: affiliate.shortName, description } }
}

/** One affiliate: its wordmark, its own description from PIN, and where to find it */
export default async function AffiliatePage({ params }: Props) {
  const affiliate = await getAffiliate((await params).affiliate)
  if (!affiliate) notFound()
  const pin = affiliatePin(affiliate)

  return (
    <div className={pageShell}>
      <Link href="/affiliates" className={`${inlineLink} inline-flex w-fit items-center gap-1.5 text-[0.9rem] font-semibold`}>
        <ArrowLeft size={15} aria-hidden />
        All affiliates
      </Link>

      <header className="flex max-w-[46rem] animate-fade-in flex-col gap-5 motion-reduce:animate-none">
        <p className={eyebrow}>{SITE_SHORT_NAME} affiliate</p>
        {/* The wordmark says the name; the heading says it to a screen reader, once */}
        <h1 className="sr-only">{affiliate.shortName}</h1>
        <div aria-hidden>
          <Wordmark brand={affiliateBrand(affiliate)} size="xl" href={null} priority />
        </div>
        {affiliate.name !== affiliate.shortName ? <p className="text-[1.05rem] font-semibold text-muted">{affiliate.name}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-3 max-[559px]:[&>*]:flex-auto">
          {pin ? (
            <a href={pin} className={button()} target="_blank" rel="noopener noreferrer">
              {affiliate.shortName} on PIN
              <ArrowUpRight size={16} aria-hidden />
            </a>
          ) : null}
          <a href={affiliateInstagram(affiliate)} className={button({ variant: pin ? 'outline' : 'primary' })} target="_blank" rel="noopener noreferrer">
            <FaInstagram aria-hidden />@{affiliate.instagram}
          </a>
          {affiliate.discord ? (
            <a href={affiliate.discord} className={button({ variant: 'outline' })} target="_blank" rel="noopener noreferrer">
              <FaDiscord aria-hidden />
              Discord
            </a>
          ) : null}
        </div>
      </header>

      {affiliate.description.length ? (
        <PageBlock title={`About ${affiliate.shortName}`} description={pin ? 'In their own words, from their PIN page.' : undefined}>
          <div className="flex max-w-3xl flex-col gap-3 text-[1.02rem] leading-[1.7] text-ink-soft">
            {affiliate.description.map((p) => (
              <p key={p} className="m-0">
                {p}
              </p>
            ))}
          </div>
        </PageBlock>
      ) : null}

      <PageCallout
        title={`Join ${SITE_SHORT_NAME} and our affiliates`}
        actions={
          <>
            <Link href="/join" className={button()}>
              Join {SITE_SHORT_NAME}
            </Link>
            <Link href="/affiliates" className={button({ variant: 'outline' })}>
              See all affiliates
            </Link>
          </>
        }
      >
        {affiliate.shortName} is one of the student organizations {SITE_SHORT_NAME} partners with at Georgia State.
      </PageCallout>
    </div>
  )
}
