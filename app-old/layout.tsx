import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import { BreakpointProvider, ThemeProvider } from "./contexts"
import "./globals.css"

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Campus Survival and Engagement Group",
    template: "%s | Campus Survival and Engagement Group"
  },
  icons: {
    icon: "/assets/favicons/favicon.ico",
    shortcut: "/assets/favicons/favicon.ico",
    apple: "/assets/favicons/apple-touch-icon.png",
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`body ${montserrat.variable}`}>
        <ThemeProvider>
          <BreakpointProvider>
            {children}
          </BreakpointProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}