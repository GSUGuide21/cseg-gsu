'use client'

import type { FC } from 'react'

import { NotificationProvider } from '@/components'
import { BUILT_IN_CHROME } from '@/lib/siteChrome'
import type { SiteChromeRow } from '@/lib/supabase/types'

import { ChromePartView } from '../../../(dashboard)/dashboard/site/ChromePartView'

/** The built-in menus, and one a page picked for its own header */
const ROW: SiteChromeRow = {
  id: 1,
  navigation: { menus: [...BUILT_IN_CHROME.navigation.menus, { id: 'guides', name: 'Guides', links: [{ href: '/guides/parking', label: 'Parking' }, { href: '/guides/food', label: 'Food' }] }] },
  header: {},
  footer: {},
  search: {},
  updated_at: '2026-11-15T15:00:00Z',
  updated_by: null,
}

export const NavigationDemo: FC = () => (
  <NotificationProvider>
    <ChromePartView part="navigation" row={ROW} pageMenus={[{ title: 'Campus guides', menu: 'guides' }]} />
  </NotificationProvider>
)
