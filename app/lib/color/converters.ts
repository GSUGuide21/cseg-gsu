import type {
  RGBA,
  HSLA,
  HSVA,
  Hex
} from './types'

export const hexToRed = (hex: string): number => {
  const hashed = hex.replace('#', '')
  return parseInt(hashed.substring(0, 2), 16)
}

export const hexToGreen = (hex: string): number => {
  const hashed = hex.replace('#', '')
  return parseInt(hashed.substring(2, 4), 16)
}

export const hexToBlue = (hex: string): number => {
  const hashed = hex.replace('#', '')
  return parseInt(hashed.substring(4, 6), 16)
}

export const hexToAlpha = (hex: string): number => {
  const hashed = hex.replace('#', '')
  return hashed.length > 6 ? parseInt(hashed.substring(6, 8), 16) : 1
}

export const hexToRgb = (hex: string): RGBA => {
  const r = hexToRed(hex)
  const g = hexToGreen(hex)
  const b = hexToBlue(hex)
  const a = hexToAlpha(hex)
  return { r, g, b, a }
}

export const rgbToHex = (r: number, g: number, b: number, a: number): Hex => {
  const hexR = r.toString(16).padStart(2, '0')
  const hexG = g.toString(16).padStart(2, '0')
  const hexB = b.toString(16).padStart(2, '0')
  const hexA = a.toString(16).padStart(2, '0')
  return `#${hexR}${hexG}${hexB}${hexA}` as Hex
}

export const rgbToHue = (r: number, g: number, b: number): number => {
  const [min, max] = [Math.min(r, g, b), Math.max(r, g, b)]
  const delta = max - min
  let h = 0

  if (delta === 0) return h

  switch (max) {
    case r:
      h = ((g - b) / delta) % 6
      break
    case g:
      h = (b - r) / delta + 2
      break
    case b:
      h = (r - g) / delta + 4
      break
  }

  h = Math.round(h * 60)
  if (h < 0) h += 360
  return h
}

export const hexToHue = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHue(r, g, b)
}

export const rgbToSaturation = (r: number, g: number, b: number): number => {
  const [min, max] = [Math.min(r, g, b), Math.max(r, g, b)]
  const delta = max - min
  let s = 0
  if (max !== 0) s = delta / max
  return Math.round(s * 100)
}

export const hexToSaturation = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex)
  return rgbToSaturation(r, g, b)
}

export const rgbToLightness = (r: number, g: number, b: number): number => {
  const [min, max] = [Math.min(r, g, b), Math.max(r, g, b)]
  const l = (min + max) / 2
  return Math.round((l / 255) * 100)
}

export const hexToLightness = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex)
  return rgbToLightness(r, g, b)
}

export const rgbToValue = (r: number, g: number, b: number): number => {
  const max = Math.max(r, g, b)
  return Math.round((max / 255) * 100)
}

export const hexToValue = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex)
  return rgbToValue(r, g, b)
}

export const rgbToHsl = (r: number, g: number, b: number, a: number = 1): HSLA => {
  const h = rgbToHue(r, g, b)
  const s = rgbToSaturation(r, g, b) / 100
  const l = rgbToLightness(r, g, b) / 100
  return { h, s, l, a }
}

export const hexToHsl = (hex: string): HSLA => {
  const h = hexToHue(hex)
  const s = hexToSaturation(hex)
  const l = hexToLightness(hex)
  const a = hexToAlpha(hex)
  return { h, s, l, a }
}

export const hslToRed = (h: number, s: number, l: number): number => {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0

  if (h < 0) h += 360
  if (h >= 360) h -= 360

  if (h >= 0 && h < 60) r = c
  else if (h >= 60 && h < 120) r = x
  else if (h >= 120 && h < 180) r = 0
  else if (h >= 180 && h < 240) r = 0
  else if (h >= 240 && h < 300) r = x
  else if (h >= 300 && h < 360) r = c
  
  return Math.round((r + m) * 255)
}

export const hslToGreen = (h: number, s: number, l: number): number => {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let g = 0

  if (h < 0) h += 360
  if (h >= 360) h -= 360

  if (h >= 0 && h < 60) g = x
  else if (h >= 60 && h < 120) g = c
  else if (h >= 120 && h < 180) g = c
  else if (h >= 180 && h < 240) g = x
  else if (h >= 240 && h < 300) g = 0
  else if (h >= 300 && h < 360) g = 0

  return Math.round((g + m) * 255)
}

export const hslToBlue = (h: number, s: number, l: number): number => {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let b = 0

  if (h < 0) h += 360
  if (h >= 360) h -= 360

  if (h >= 0 && h < 60) b = 0
  else if (h >= 60 && h < 120) b = x
  else if (h >= 120 && h < 180) b = c
  else if (h >= 180 && h < 240) b = c
  else if (h >= 240 && h < 300) b = x
  else if (h >= 300 && h < 360) b = c

  return Math.round((b + m) * 255)
}

export const hslToRgb = (h: number, s: number, l: number, a: number = 1): RGBA => {
  const r = hslToRed(h, s, l)
  const g = hslToGreen(h, s, l)
  const b = hslToBlue(h, s, l)
  return { r, g, b, a }
}

export const hslToHex = (h: number, s: number, l: number, a: number = 1): Hex => {
  const { r, g, b } = hslToRgb(h, s, l, a)
  return rgbToHex(r, g, b, a)
}

export const hslToHsv = (h: number, s: number, l: number, a: number = 1): HSVA => {
  const s2 = (2 - s) * s * l / (l + s - 1)
  const v = l + s2
  const s3 = v === 0 ? 0 : (2 * (v - l)) / v
  return { h, s: s3, v, a }
}

export const hexToHsv = (hex: string): HSVA => {
  const h = hexToHue(hex)
  const s = hexToSaturation(hex)
  const v = hexToValue(hex)
  const a = hexToAlpha(hex)
  return { h, s, v, a }
}

export const rgbToHsv = (r: number, g: number, b: number, a: number = 1): HSVA => {
  const h = rgbToHue(r, g, b)
  const s = rgbToSaturation(r, g, b)
  const v = rgbToValue(r, g, b)
  return { h, s, v, a }
}

export const hsvToRed = (h: number, s: number, v: number): number => { 
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0

  if (h < 0) h += 360
  if (h >= 360) h -= 360

  if (h >= 0 && h < 60) r = c
  else if (h >= 60 && h < 120) r = x
  else if (h >= 120 && h < 180) r = 0
  else if (h >= 180 && h < 240) r = 0
  else if (h >= 240 && h < 300) r = x
  else if (h >= 300 && h < 360) r = c

  return Math.round((r + m) * 255)
}

export const hsvToGreen = (h: number, s: number, v: number): number => {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let g = 0

  if (h < 0) h += 360
  if (h >= 360) h -= 360

  if (h >= 0 && h < 60) g = x
  else if (h >= 60 && h < 120) g = c
  else if (h >= 120 && h < 180) g = c
  else if (h >= 180 && h < 240) g = x
  else if (h >= 240 && h < 300) g = 0
  else if (h >= 300 && h < 360) g = 0

  return Math.round((g + m) * 255)
}

export const hsvToBlue = (h: number, s: number, v: number): number => {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let b = 0

  if (h < 0) h += 360
  if (h >= 360) h -= 360

  if (h >= 0 && h < 60) b = 0
  else if (h >= 60 && h < 120) b = x
  else if (h >= 120 && h < 180) b = c
  else if (h >= 180 && h < 240) b = c
  else if (h >= 240 && h < 300) b = x
  else if (h >= 300 && h < 360) b = c

  return Math.round((b + m) * 255)
}

export const hsvToRgb = (h: number, s: number, v: number, a: number = 1): RGBA => {
  const r = hsvToRed(h, s, v)
  const g = hsvToGreen(h, s, v)
  const b = hsvToBlue(h, s, v)
  
  return { r, g, b, a }
}

export const hsvToHex = (h: number, s: number, v: number, a: number = 1): Hex => {
  const { r, g, b } = hsvToRgb(h, s, v, a)
  return rgbToHex(r, g, b, a)
}

export const hsvToHsl = (h: number, s: number, v: number, a: number = 1): HSLA => { 
  const l = (2 - s) * v / 2
  const s2 = l === 0 ? 0 : (2 * (v - l)) / v
  return { h, s: s2, l, a }
}

export const CONVERTERS = {
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  hexToHsl,
  hslToRgb,
  hslToHex,
  hslToHsv,
  hexToHsv,
  hsvToRgb,
  hsvToHex,
  hsvToHsl,
  rgbToHsv,
  rgbToHue,
  hexToHue,
  rgbToSaturation,
  hexToSaturation,
  rgbToLightness,
  hexToLightness,
  rgbToValue,
  hexToValue,
  hexToRed,
  hexToGreen,
  hexToBlue,
  hexToAlpha
}
