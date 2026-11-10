import type { Metadata } from 'next'

import { ClubDetailsProvider } from '@/globals/ClubDetails'
import { Footer } from '@/globals/Footer'
import { Header } from '@/globals/Header'
import { PreviewBanner } from '@/globals/PreviewBanner'
import { SiteBanner } from '@/globals/SiteBanner'
import { getClubDetails } from '@/lib/dashboard/public'

/**
 * What search and link previews fall back to, as officers set them in Settings: the site's
 * description, and an image for pages with none of their own. A page's own win over both.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { siteDescription, shareImageUrl } = await getClubDetails()
  const images = shareImageUrl ? [{ url: shareImageUrl }] : undefined
  return {
    ...(siteDescription ? { description: siteDescription } : {}),
    ...(images ? { openGraph: { images }, twitter: { card: 'summary_large_image', images } } : {}),
  }
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClubDetailsProvider details={await getClubDetails()}>
      <PreviewBanner />
      <Header />
      <main className="min-h-screen pt-header">
        <SiteBanner />
        {children}
      </main>
      <Footer />
    </ClubDetailsProvider>
  )
}
