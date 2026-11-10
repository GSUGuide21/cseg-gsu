import type { MetadataRoute } from 'next'

import { absoluteUrl } from '@/lib/siteUrl'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/login', '/auth', '/dev', '/search'] },
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
