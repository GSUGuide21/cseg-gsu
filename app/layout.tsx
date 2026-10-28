import type { Metadata, Viewport } from 'next'
import { Montserrat } from 'next/font/google'
import { CLUB_DESCRIPTION } from './globals/config/site'
import { THEME_INIT_SCRIPT } from './globals/config/theme'
import { ThemeColorMeta } from './globals/ThemeColorMeta'
import './globals.css'

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
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
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <ThemeColorMeta />
        {children}
      </body>
    </html>
  )
}
