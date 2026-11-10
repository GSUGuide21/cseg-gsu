import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ExecutiveDirectory } from '@/(page)/executives/components/ExecutiveDirectory'
import type { Executive } from '@/(page)/executives/components/types'
import { PageHeader } from '@/globals/Page'
import { pageShell } from '@/globals/ui/styles'

export const metadata: Metadata = {
  title: 'Executives test',
  robots: { index: false, follow: false },
}

/** Made-up people, one for each way a card can look */
const SAMPLE_EXECUTIVES: readonly Executive[] = [
  {
    firstName: 'Sample',
    lastName: 'Founder',
    role: 'President',
    bio: 'Has everything a card can show: a photo, the founder badge, two terms, an email and phone number, and every social link.',
    isFounder: true,
    avatarSrc: '/assets/favicons/android-chrome-192x192-blue.png',
    serviceIntervals: [{ startYear: 2025 }, { startYear: 2021, endYear: 2023 }],
    contact: {
      email: 'sample.founder@example.com',
      phone: '(404) 555-0100',
      instagram: 'https://example.com/instagram',
      twitter: 'https://example.com/x',
      linkedIn: 'https://example.com/linkedin',
      youtube: 'https://example.com/youtube',
      website: 'https://example.com',
      facebook: 'https://example.com/facebook',
    },
  },
  {
    firstName: 'Initials',
    lastName: 'Only',
    role: 'Vice President of Member Engagement',
    bio: 'Has no photo, so the card falls back to initials. The role is long enough to wrap.',
    isFounder: false,
    serviceIntervals: [{ startYear: 2025, endYear: null }],
    contact: { email: 'a.very.long.address.that.has.to.wrap.somewhere@students.example.com' },
  },
  {
    firstName: 'Bare',
    lastName: 'Minimum',
    role: 'Secretary',
    bio: 'Has no contact details at all, so the card ends here.',
    isFounder: false,
    serviceIntervals: [{ startYear: 2026 }],
  },
  {
    firstName: 'Christopher',
    lastName: 'Washington',
    role: 'Director of Events',
    bio: 'A long first name, which has to shrink to fit on a phone.',
    isFounder: false,
    serviceIntervals: [{ startYear: 2025 }],
    contact: { instagram: 'https://example.com/instagram' },
  },
  {
    firstName: 'Bo',
    lastName: 'Montgomery-Williams',
    role: 'Director of Outreach',
    bio: 'A short first name over a long last name, the widest the script line gets.',
    isFounder: false,
    serviceIntervals: [{ startYear: 2025 }],
    contact: { phone: '(404) 555-0101' },
  },
  {
    firstName: 'Alexandria',
    lastName: 'Li',
    role: 'Director of Marketing',
    bio: 'A short last name, tucked under the end of a long first name.',
    isFounder: false,
    serviceIntervals: [{ startYear: 2026 }],
  },
  {
    firstName: 'Jo',
    lastName: 'Li',
    role: 'Webmaster',
    bio: 'Both names short, the smallest the name gets.',
    isFounder: false,
    avatarSrc: '/assets/favicons/android-chrome-192x192-blue.png',
    serviceIntervals: [{ startYear: 2026 }],
    contact: { email: 'jo.li@example.com' },
  },
  {
    firstName: 'Former',
    lastName: 'Treasurer',
    role: 'Treasurer',
    bio: 'Every term has ended, so this card is listed under past executives.',
    isFounder: false,
    serviceIntervals: [{ startYear: 2022, endYear: 2024 }],
    contact: { linkedIn: 'https://example.com/linkedin' },
  },
  {
    firstName: 'Longtime',
    lastName: 'Advisor',
    role: 'Founding Treasurer',
    bio: 'A founder who has stepped down: a past card with the badge, and a list of terms long enough to wrap.',
    isFounder: true,
    serviceIntervals: [
      { startYear: 2015, endYear: 2016 },
      { startYear: 2017, endYear: 2018 },
      { startYear: 2019, endYear: 2020 },
      { startYear: 2021, endYear: 2022 },
      { startYear: 2023, endYear: 2024 },
    ],
  },
]

/**
 * The executives page filled in with made-up people, for checking how the cards look. Only
 * served by `next dev`: the live site answers this URL with a 404.
 */
export default function ExecutivesTestPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  return (
    <div className={pageShell}>
      <PageHeader eyebrow="Development only" title="Executives" lead="Sample people, to check the cards. This page isn’t served in production." />
      <ExecutiveDirectory executives={SAMPLE_EXECUTIVES} />
    </div>
  )
}
