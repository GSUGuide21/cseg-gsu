import type { Metadata } from 'next'

import { ClubDetailsProvider } from '@/globals/ClubDetails'
import { Footer } from '@/globals/Footer'
import { Header } from '@/globals/Header'
import { PreviewBanner } from '@/globals/PreviewBanner'
import { SiteBanner } from '@/globals/SiteBanner'
import { getClubDetails, getNavPages, getPageMenus, getSiteChrome } from '@/lib/dashboard/public'
import { footerBottomLinks, footerColumns, headerLinks } from '@/lib/siteChrome'

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
  // The header and footer as the dashboard has them (each showing the menus it was given), and the pages officers put in the menu
  const [details, nav, chrome, pageMenus] = await Promise.all([getClubDetails(), getNavPages(), getSiteChrome(), getPageMenus()])
  return (
    <ClubDetailsProvider details={details}>
      <PreviewBanner />
      <Header pages={nav.header} links={headerLinks(chrome)} pageMenus={pageMenus} header={chrome.header} />
      <main className="min-h-screen pt-header">
        <SiteBanner />
        {children}
      </main>
      <Footer pages={nav.footer} sections={footerColumns(chrome)} bottomLinks={footerBottomLinks(chrome)} cta={chrome.footer.cta} />
    </ClubDetailsProvider>
  )
}
