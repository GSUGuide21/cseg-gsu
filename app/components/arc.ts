/**
 * Arc drawing for the ring and gauge components (Progress, Meter). Angles are in radians,
 * measured clockwise from 12 o'clock: 0 is the top, π/2 the right, π the bottom.
 */

/** The point at `angle` on a circle */
export const polar = (cx: number, cy: number, r: number, angle: number) => ({
  x: cx + r * Math.sin(angle),
  y: cy - r * Math.cos(angle),
})

/** An SVG path along the circle from `start` to `end` (clockwise); a full turn draws a full circle */
export const arcPath = (cx: number, cy: number, r: number, start: number, end: number) => {
  const sweep = Math.min(end - start, Math.PI * 2 - 0.0001)
  const a = polar(cx, cy, r, start)
  const b = polar(cx, cy, r, start + sweep)
  const large = sweep > Math.PI ? 1 : 0
  const f = (n: number) => Math.round(n * 1000) / 1000
  return `M ${f(a.x)} ${f(a.y)} A ${r} ${r} 0 ${large} 1 ${f(b.x)} ${f(b.y)}`
}

/** A gauge's sweep when none is given: three quarters of a circle, open at the bottom */
export const DEFAULT_SECTOR = { startAngle: -0.75 * Math.PI, endAngle: 0.75 * Math.PI }

/** Roughly how wide one bold character is, in ems (wide enough for "W" and digits) */
const CHAR_EM = 0.62
/** Line height the centered text uses, in ems (leading-tight) */
const LINE_EM = 1.25

/**
 * The text in the middle of a ring or gauge, sized so all of it, corners included, sits
 * inside the ring's open middle. A rectangle as wide as a circle pokes out at its corners,
 * so it's the box's half-diagonal that has to fit. It tries the text on one line and
 * wrapped at its spaces ("Very / strong"), and takes whichever fits larger. `extraHeight`
 * leaves room for rows under it (a meter's status word). Never above `max`, never below 9px.
 */
export const centerText = (text: string, size: number, thickness: number, max: number, extraHeight = 0) => {
  // Radius of the open middle, less a little breathing room from the ring
  const room = size / 2 - thickness - 3
  const words = text.split(/\s+/).filter(Boolean)
  const longest = Math.max(1, ...words.map((w) => w.length))
  /** Largest font where a box of `chars` wide by `lines` tall (plus extra) fits the circle */
  const fit = (chars: number, lines: number) => {
    // Solve (chars·CHAR_EM·f / 2)² + ((lines·LINE_EM·f + extra) / 2)² ≤ room² for f, by halving
    let lo = 0
    let hi = max
    for (let i = 0; i < 20; i++) {
      const f = (lo + hi) / 2
      const ok = Math.hypot((chars * CHAR_EM * f) / 2, (lines * LINE_EM * f + extraHeight) / 2) <= room
      if (ok) lo = f
      else hi = f
    }
    return lo
  }
  const oneLine = fit(text.length, 1)
  const wrapped = words.length > 1 ? fit(longest, words.length) : 0
  const fontSize = Math.max(9, Math.round(Math.max(oneLine, wrapped) * 10) / 10)
  return wrapped > oneLine
    ? { fontSize, maxWidth: Math.ceil(longest * CHAR_EM * fontSize) + 2 }
    : { fontSize, whiteSpace: 'nowrap' as const }
}

/** How far through its range a value is, 0 to 1 */
export const fraction = (value: number, min: number, max: number) => (max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0)
