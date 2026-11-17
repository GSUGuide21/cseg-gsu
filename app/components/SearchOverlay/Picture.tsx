'use client'
/* eslint-disable @next/next/no-img-element -- results' pictures come from anywhere, at any size */

import { useState, type FC, type ReactNode } from 'react'

/** A result's picture, or what stands in for it when it doesn't load */
export const Picture: FC<{ src: string; className?: string; fallback: ReactNode }> = ({ src, className, fallback }) => {
  const [failed, setFailed] = useState<string | null>(null)
  if (failed === src) return <>{fallback}</>
  return <img src={src} alt="" loading="lazy" onError={() => setFailed(src)} className={className} />
}
