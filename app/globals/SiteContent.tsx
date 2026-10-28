'use client'

import { createContext, useContext, type FC, type ReactNode } from 'react'

import type { SiteContent } from '@/lib/references'

/**
 * What's published on the site (eateries, posts, pages), for the blocks that draw it live:
 * Eateries and References. A page with one of those blocks is wrapped in this; without it
 * (null), the blocks have nothing to draw from.
 */
const SiteContentContext = createContext<SiteContent | null>(null)

export const SiteContentProvider: FC<{ content: SiteContent; children: ReactNode }> = ({ content, children }) => (
  <SiteContentContext.Provider value={content}>{children}</SiteContentContext.Provider>
)

export const useSiteContent = () => useContext(SiteContentContext)
