import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { requireOfficer } from '@/lib/dashboard/dal'
import { getSiteChromeRow, listPageMenuUses } from '@/lib/dashboard/queries'
import { CHROME_PARTS, isChromePart } from '@/lib/siteChrome'

import { ChromePartView } from '../ChromePartView'

type Props = { params: Promise<{ part: string }>; searchParams: Promise<{ menu?: string | string[] }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { part } = await params
  return { title: isChromePart(part) ? CHROME_PARTS[part].name : 'Site chrome' }
}

/** Navigation, Search, Header, or Footer: each its own screen (/dashboard/site/header) */
export default async function DashboardChromePartPage({ params, searchParams }: Props) {
  await requireOfficer()
  const [{ part }, { menu }] = await Promise.all([params, searchParams])
  if (!isChromePart(part)) notFound()
  const [row, pageMenus] = await Promise.all([getSiteChromeRow(), part === 'navigation' ? listPageMenuUses() : []])
  // Keyed, so going from one part to another starts from that part's own saved copy
  return <ChromePartView key={part} part={part} row={row} pageMenus={pageMenus} initialMenu={Array.isArray(menu) ? menu[0] : menu} />
}
