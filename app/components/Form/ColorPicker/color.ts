/**
 * Color conversions for the picker. It edits in HSV (hue, saturation, value), the space
 * its square and hue bar map onto; values go in and out as "#rrggbb".
 */

/** h: 0–360, s and v: 0–1 */
export type HSV = { h: number; s: number; v: number }
type RGB = { r: number; g: number; b: number }

export const hexToRgb = (hex: string): RGB | null => {
  let h = hex.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(h)) h = [...h].map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/.test(h)) return null
  const n = parseInt(h, 16)
  return { r: n >> 16, g: (n >> 8) & 255, b: n & 255 }
}

export const rgbToHex = ({ r, g, b }: RGB) => `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`

/** "#abc" or "abc123" → "#aabbcc" / "#abc123"; null when it isn't a hex color */
export const normalizeHex = (hex: string) => {
  const rgb = hexToRgb(hex)
  return rgb ? rgbToHex(rgb) : null
}

export const rgbToHsv = ({ r, g, b }: RGB): HSV => {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255]
  const max = Math.max(rr, gg, bb)
  const d = max - Math.min(rr, gg, bb)
  let h = 0
  if (d) {
    if (max === rr) h = ((gg - bb) / d) % 6
    else if (max === gg) h = (bb - rr) / d + 2
    else h = (rr - gg) / d + 4
    h = (h * 60 + 360) % 360
  }
  return { h, s: max ? d / max : 0, v: max }
}

export const hsvToRgb = ({ h, s, v }: HSV): RGB => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255
  }
  return { r: f(5), g: f(3), b: f(1) }
}

export const hsvToHex = (hsv: HSV) => rgbToHex(hsvToRgb(hsv))
export const hexToHsv = (hex: string): HSV => rgbToHsv(hexToRgb(hex) ?? { r: 0, g: 0, b: 0 })

/** h: 0–360, s and l: 0–1 */
export const rgbToHsl = ({ r, g, b }: RGB) => {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255]
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  const d = max - min
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0
  return { h: rgbToHsv({ r, g, b }).h, s, l }
}

export const hslToRgb = ({ h, s, l }: { h: number; s: number; l: number }): RGB => {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255
  }
  return { r: f(0), g: f(8), b: f(4) }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
/** "50%" → 127.5 of 255; "128" → 128 */
const channel = (s: string) => clamp(s.endsWith('%') ? (parseFloat(s) / 100) * 255 : parseFloat(s), 0, 255)
const fraction = (s: string) => clamp(parseFloat(s) / (s.endsWith('%') ? 100 : 1), 0, 1)

/** A color as "#rrggbb" plus its opacity, 0 (clear) to 1 (solid) */
export interface ColorValue {
  hex: string
  alpha: number
}

/**
 * Any other color the browser understands, such as CSS names ("rebeccapurple"), read
 * through a canvas, which writes it back as hex or rgba(). Null outside a browser.
 */
const browserColor = (text: string): ColorValue | null => {
  if (typeof document === 'undefined' || typeof CSS === 'undefined' || !CSS.supports?.('color', text)) return null
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = text
  const out = String(ctx.fillStyle)
  return /^(#|rgb)/.test(out) ? parseColorWithAlpha(out) : null
}

/**
 * Reads a color and its opacity as people copy them: "#0039a6", "#0039a6cc", "#03a",
 * "#03ac", "rgb(0 57 166)", "rgb(0 57 166 / 80%)", "rgba(0, 57, 166, 0.8)",
 * "hsl(220 100% 33%)", "hsla(220deg, 100%, 33%, 0.8)", or (in a browser) a CSS name like
 * "rebeccapurple" or "transparent". Null when it isn't a color.
 */
export const parseColorWithAlpha = (text: string): ColorValue | null => {
  const t = text.trim().toLowerCase()
  if (!t) return null
  const hexMatch = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(t)
  if (hexMatch) {
    const h = hexMatch[1].length <= 4 ? [...hexMatch[1]].map((c) => c + c).join('') : hexMatch[1]
    return { hex: `#${h.slice(0, 6)}`, alpha: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 }
  }
  const fn = /^(rgba?|hsla?)\(\s*([^)]*)\)$/.exec(t)
  if (!fn) return browserColor(t)
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean)
  if (parts.length < 3) return null
  const alpha = parts[3] === undefined ? 1 : fraction(parts[3])
  if (Number.isNaN(alpha)) return null
  if (fn[1].startsWith('rgb')) {
    const [r, g, b] = parts.slice(0, 3).map(channel)
    return [r, g, b].some(Number.isNaN) ? null : { hex: rgbToHex({ r, g, b }), alpha }
  }
  const h = ((parseFloat(parts[0]) % 360) + 360) % 360
  const [s, l] = parts.slice(1, 3).map(fraction)
  return [h, s, l].some(Number.isNaN) ? null : { hex: rgbToHex(hslToRgb({ h, s, l })), alpha }
}

/**
 * Reads a color as parseColorWithAlpha does, ignoring its opacity, and returns "#rrggbb".
 * A fully transparent color is refused, since "#rrggbb" can't say "see-through".
 */
export const parseColor = (text: string): string | null => {
  const c = parseColorWithAlpha(text)
  return c && c.alpha > 0 ? c.hex : null
}

/** 0.8 → "cc", for the last two digits of "#rrggbbaa" */
const alphaHex = (alpha: number) => Math.round(clamp(alpha, 0, 1) * 255).toString(16).padStart(2, '0')

/** "#0039a6" at 0.8 → "#0039a6cc" */
export const withAlpha = (hex: string, alpha: number) => `${hex}${alphaHex(alpha)}`

/** An opacity as CSS writes it after the slash: 0.8, 0.25, 1 */
const alphaText = (alpha: number) => String(Math.round(alpha * 100) / 100)

/** The color's red, green, blue (0–255) and hue (0–360), saturation, lightness (0–100) */
export const channels = (hex: string) => {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 }
  const hsl = rgbToHsl(rgb)
  return { ...rgb, h: Math.round(hsl.h), s: Math.round(hsl.s * 100), l: Math.round(hsl.l * 100) }
}

/** Builds "#rrggbb" from hue 0–360, saturation and lightness 0–100 */
export const hslToHex = (h: number, s: number, l: number) => rgbToHex(hslToRgb({ h: ((h % 360) + 360) % 360, s: clamp(s, 0, 100) / 100, l: clamp(l, 0, 100) / 100 }))

/** Builds "#rrggbb" from red, green, and blue, 0–255 each */
export const rgbHex = (r: number, g: number, b: number) => rgbToHex({ r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255) })

/**
 * The color written three ways, as CSS accepts them. With an `alpha`, each carries it:
 * "#0039A6CC", "rgb(0 57 166 / 0.8)", "hsl(219 100% 33% / 0.8)".
 */
export const colorFormats = (hex: string, alpha?: number) => {
  const c = channels(hex)
  const a = alpha === undefined ? '' : ` / ${alphaText(alpha)}`
  return {
    HEX: (alpha === undefined ? hex : withAlpha(hex, alpha)).toUpperCase(),
    RGB: `rgb(${c.r} ${c.g} ${c.b}${a})`,
    HSL: `hsl(${c.h} ${c.s}% ${c.l}%${a})`,
  }
}

/** What a see-through color looks like over a background: "#0039a6" at 0.5 over white is "#809cd3" */
export const blend = (hex: string, alpha: number, background: string) => {
  const [f, b] = [hexToRgb(hex) ?? { r: 0, g: 0, b: 0 }, hexToRgb(background) ?? { r: 255, g: 255, b: 255 }]
  const mix = (x: number, y: number) => x * alpha + y * (1 - alpha)
  return rgbToHex({ r: mix(f.r, b.r), g: mix(f.g, b.g), b: mix(f.b, b.b) })
}

/** WCAG relative luminance: 0 for black, 1 for white */
export const luminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 }
  const lin = (c: number) => {
    const x = c / 255
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG contrast between two colors, from 1 (none) to 21 (black on white) */
export const contrastRatio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * The best WCAG rating text in this color can earn on a background: AAA (7:1) and AA
 * (4.5:1) for body text, "AA large" (3:1) for large or bold text and icons only.
 */
export const wcagRating = (ratio: number) => (ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large' : 'Fails')

/** Black or white, whichever reads better on the color (for the check on a swatch) */
export const contrastText = (hex: string) => (contrastRatio(hex, '#000000') >= contrastRatio(hex, '#ffffff') ? '#000000' : '#ffffff')
