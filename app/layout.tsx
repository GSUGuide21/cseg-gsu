import type { Metadata, Viewport } from 'next'
import { Montserrat, Yellowtail } from 'next/font/google'
import { CLUB_DESCRIPTION } from './globals/config/site'
import { THEME_INIT_SCRIPT } from './globals/config/theme'
import { ThemeColorMeta } from './globals/ThemeColorMeta'
import { cn } from "@/lib/cn"
import './globals.css'
import { SITE_URL } from '@/lib/siteUrl'

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  display: 'swap',
})

const yellowtail = Yellowtail({
  variable: '--font-yellowtail',
  subsets: ['latin'],
  display: 'swap',
  weight: '400',
})

export const metadata: Metadata = {
  // What relative link-preview images resolve against
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Campus Survival and Engagement Group',
    template: '%s | Campus Survival and Engagement Group',
  },
  description: CLUB_DESCRIPTION.oneLiner,
  icons: {
    icon: '/assets/favicons/favicon.ico',
    shortcut: '/assets/favicons/favicon.ico',
    apple: '/assets/favicons/apple-touch-icon.png',
  },
}

// theme-color follows the site's own toggle, not the OS setting, so it's set by
// THEME_INIT_SCRIPT + ThemeColorMeta instead of here.
export const viewport: Viewport = {
  viewportFit: 'cover',
}

export type RootLayoutProps = {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    // The init script may add .dark before hydration, so the class can differ from the server HTML
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={cn(`${montserrat.variable} font-sans antialiased`, yellowtail.variable)}>
        <ThemeColorMeta />
        {children}
      </body>
    </html>
  )
}
