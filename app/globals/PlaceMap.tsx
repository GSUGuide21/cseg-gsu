'use client'

import 'maplibre-gl/dist/maplibre-gl.css'

import type * as Gl from 'maplibre-gl'
import { useEffect, useRef, useState, type FC } from 'react'

import { addBuildings, STYLE_URL, tuneBaseStyle } from '@/globals/CampusMap/gl'
import { cn } from '@/lib/cn'

const hasWebGL = () => {
  // No WebGL at all (tests' jsdom among them): don't ask a canvas for it
  if (typeof WebGLRenderingContext === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

const theme = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light')

/**
 * A small campus map with one pin, for a page's Map place block: the campus map's look, a
 * drag to look around, and two-finger or Ctrl+scroll zoom (so the page still scrolls past
 * it). It loads once it's near the screen; without WebGL it isn't drawn at all, and the
 * block's links still work.
 */
export const PlaceMap: FC<{ lat: number; lng: number; label: string; color?: string; className?: string }> = ({ lat, lng, label, color = '#0039a6', className }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  // Waits until it's about to scroll into view: a page may have several
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') return setNear(true)
    const watch = new IntersectionObserver(([entry]) => entry?.isIntersecting && setNear(true), { rootMargin: '200px' })
    watch.observe(el)
    return () => watch.disconnect()
  }, [])

  useEffect(() => {
    if (!near) return
    if (!hasWebGL()) return setUnavailable(true)
    let cancelled = false
    let map: Gl.Map | undefined
    import('maplibre-gl')
      .then((gl) => {
        if (cancelled || !containerRef.current) return
        // The worker can't be found relative to the bundled script; postinstall copies it here
        gl.setWorkerUrl(`/vendor/maplibre-gl-worker-${gl.getVersion()}.mjs`)
        map = new gl.Map({
          container: containerRef.current,
          style: STYLE_URL[theme()],
          center: [lng, lat],
          zoom: 17,
          minZoom: 14,
          maxZoom: 19,
          cooperativeGestures: true,
          attributionControl: { compact: true },
        })
        const m = map
        m.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right')
        m.on('style.load', () => {
          tuneBaseStyle(m, theme())
          addBuildings(m, theme())
        })
        const pin = document.createElement('div')
        pin.innerHTML = `<svg viewBox="0 0 24 32" width="28" height="37" aria-hidden="true" style="display:block"><path d="M12 31s10-11.2 10-19A10 10 0 0 0 2 12c0 7.8 10 19 10 19z" fill="${color}" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="3.5" fill="white"/></svg>`
        new gl.Marker({ element: pin, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(m)
      })
      .catch(() => !cancelled && setUnavailable(true))
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [near, lat, lng, color])

  if (unavailable) return null
  return <div ref={containerRef} role="img" aria-label={`Map: ${label}`} className={cn('overflow-hidden bg-fill', className)} />
}
