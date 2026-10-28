import { Footer } from '@/globals/Footer'
import { Header } from '@/globals/Header'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-header">{children}</main>
      <Footer />
    </>
  )
}
