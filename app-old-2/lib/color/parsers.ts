import type {
  RGB,
  RGBA,
  HSL,
  HSLA,
  HSV,
  HSVA,
  Hex,
  RGBString2,
  RGBAString2,
  HSLString2,
  HSLAString2,
  RGBAArray,
  RGBArray
} from './types'
import {
  isHex,
  isRGBString,
  isRGBAString,
  isHSLString,
  isHSLAString
} from './checks'
import { PATTERNS } from "./patterns"
import { 
  hslToRgb, 
  rgbToHsl,
  rgbToHsv
} from './converters'
import { COLOR_NAMES } from './util'

export const hex3 = (string: string): RGB => {
  const match = string.match(PATTERNS.HEX3)
  if (!match) throw new Error(`Invalid 3-digit hex string: ${string}`)
  const [r, g, b] = match.slice(1).map(c => parseInt(`${c.repeat(2)}`, 16))
  return { r, g, b }
}

export const hex6 = (string: string): RGB => {
  const match = string.match(PATTERNS.HEX6)
  if (!match) throw new Error(`Invalid 6-digit hex string: ${string}`)
  const [r, g, b] = match.slice(1).map(c => parseInt(c, 16))
  return { r, g, b }
}

export const hex8 = (string: string): RGBA => {
  const match = string.match(PATTERNS.HEX8)
  if (!match) throw new Error(`Invalid 8-digit hex string: ${string}`)
  const lastIndex = match.length - 1
  const [r, g, b, a] = match.slice(1).map((c, i) => {
    const v = parseInt(c, 16)
    const f = i === lastIndex ? 1 : 255
    return Math.max(Math.min(Math.round(v / f), f), 0)
  })
  return { r, g, b, a }
}

export const hex = (string: string): RGB | RGBA => {
  if (PATTERNS.HEX3.test(string)) return hex3(string)
  if (PATTERNS.HEX6.test(string)) return hex6(string)
  if (PATTERNS.HEX8.test(string)) return hex8(string)
  throw new Error(`Invalid Hex string: ${string}`)
}

export const rgb = (string: string): RGB => {
  const match =
    string.match(PATTERNS.RGB) ||
    string.match(PATTERNS.RGB2) ||
    string.match(PATTERNS.RGBPercent) ||
    string.match(PATTERNS.RGBPercent2)

  const rgbIsPercent =
    PATTERNS.RGBPercent.test(string) ||
    PATTERNS.RGBPercent2.test(string)

  if (!match) throw new Error(`Invalid RGB string: ${string}`)

  const [red, green, blue] = match.slice(1)
  const f = rgbIsPercent ? 100 : 1
  const s = rgbIsPercent ? 255 : 1

  const r = Math.min(Math.max((parseInt(red) / f) * s, 255), 0)
  const g = Math.min(Math.max((parseInt(green) / f) * s, 255), 0)
  const b = Math.min(Math.max((parseInt(blue) / f) * s, 255), 0)

  return { r, g, b }
}

export const rgba = (string: string): RGBA => {
  const match =
    string.match(PATTERNS.RGBA) ||
    string.match(PATTERNS.RGBA2) ||
    string.match(PATTERNS.RGBA3) ||
    string.match(PATTERNS.RGBAPercent) ||
    string.match(PATTERNS.RGBAPercent2) ||
    string.match(PATTERNS.RGBAPercent3) ||
    string.match(PATTERNS.RGBAPercent4)

  const alphaIsPercent = 
    PATTERNS.RGBAPercent3.test(string) ||
    PATTERNS.RGBAPercent4.test(string)

  const rgbaIsPercent = 
    PATTERNS.RGBAPercent.test(string) ||
    PATTERNS.RGBAPercent2.test(string) ||
    alphaIsPercent

  if (!match) throw new Error(`Invalid RGBA string: ${string}`)
  
  const [red, green, blue, alpha] = match.slice(1)

  const f = rgbaIsPercent ? 100 : 1
  const h = alphaIsPercent ? 100 : 1
  const s = rgbaIsPercent ? 255 : 1

  const r = Math.min(Math.max((parseInt(red) / f) * s, 255), 0)
  const g = Math.min(Math.max((parseInt(green) / f) * s, 255), 0)
  const b = Math.min(Math.max((parseInt(blue) / f) * s, 255), 0)
  const a = Math.min(Math.max(parseInt(alpha) / h, 1), 0)

  return { r, g, b, a }
}

export const angles: Record<string, (x: string) => number> = {
  deg: (x: string) => parseFloat(x),
  rad: (x: string) => (parseFloat(x) * 180) / Math.PI,
  turn: (x: string) => parseFloat(x) * 360,
  grad: (x: string) => (parseFloat(x) * 360) / 400
}

export const parseAngle = (input: string[]) => {
  if (!input || input.length !== 2) throw new Error(`Invalid input: Expected an array with [value, unit], but got ${JSON.stringify(input)}.`)
  
  const [value, angle] = input
  if (!value || isNaN(parseFloat(value))) throw new Error(`Invalid angle value: (${value}) is not a valid number`)
  if (!(angle in angles)) throw new Error(`Invalid angle type: ${angle}`)

  const convert = angles[angle]
  return convert(value)
}

export const hsl = (string: string): HSL => {
  let match = string.match(PATTERNS.HSL) || string.match(PATTERNS.HSL2)

  if (!match) {
    match = string.match(PATTERNS.HSL3) || string.match(PATTERNS.HSL4)
    if (!match) throw new Error(`Invalid HSL string: ${string}`)

    const [hue, saturation, lightness] = match.slice(1)
    const angle = hue.match(PATTERNS.ANGLE)

    if (!angle) throw new Error(`Invalid angle: ${angle}`)
    const h = parseAngle([...angle.slice(1)])
    const s = parseInt(saturation) / 100
    const l = parseInt(lightness) / 100

    return { h, s, l }
  }

  const [h, s, l] = match.slice(1).map((c, i) => parseInt(c) / (i === 0 ? 1 : 100))
  return { h, s, l }
}

export const hsla = (string: string): HSLA => {
  const match = 
    string.match(PATTERNS.HSLA) ||
    string.match(PATTERNS.HSLA2) ||
    string.match(PATTERNS.HSLA3) ||
    string.match(PATTERNS.HSLA4) ||
    string.match(PATTERNS.HSLA5) ||
    string.match(PATTERNS.HSLA6) ||
    string.match(PATTERNS.HSLA7) ||
    string.match(PATTERNS.HSLA8)

  const alphaIsPercent = 
    PATTERNS.HSLA3.test(string) ||
    PATTERNS.HSLA4.test(string) ||
    PATTERNS.HSLA7.test(string) ||
    PATTERNS.HSLA8.test(string)

  if (!match) throw new Error(`Invalid HSLA string: ${string}`)
  
  const [hue, saturation, lightness, alpha] = match.slice(1)

  const angle = hue.match(PATTERNS.ANGLE)
  const h = angle ? parseAngle([...angle.slice(1)]) : parseInt(hue)
  const s = parseFloat(saturation) / 100
  const l = parseFloat(lightness) / 100

  const f = alphaIsPercent ? 100 : 1
  const a = alpha ? parseFloat(alpha) / f : 1
  
  if (isNaN(h) || h < 0 || h > 360) throw new Error(`Invalid hue value: ${h}`)
  if (isNaN(s) || s < 0 || s > 1) throw new Error(`Invalid saturation value: ${s}`)
  if (isNaN(l) || l < 0 || l > 1) throw new Error(`Invalid lightness value: ${l}`)
  if (isNaN(a) || a < 0 || a > 1) throw new Error(`Invalid alpha value: ${a}`)
    
  return { h, s, l, a }
}

export const isColorName = (string: string): boolean => {
  const colorName = string.toLowerCase()
  return colorName in COLOR_NAMES
}

export const parseToRgb = (string: string): RGB => {
  if (isColorName(string)) return parseToRgb(COLOR_NAMES[string])
  if (isHex(string)) return hex(string)
  if (isRGBString(string)) return rgb(string)
  
  if (isRGBAString(string)) {
    const { r, g, b } = rgba(string)
    return { r, g, b }
  }

  if (isHSLString(string)) {
    const { h, s, l } = hsl(string)
    return hslToRgb(h, s, l)
  }

  if (isHSLAString(string)) {
    const { h, s, l } = hsla(string)
    return hslToRgb(h, s, l)
  }

  return { r: 0, g: 0, b: 0 }
}

export const parseToRgbString = (string: string): RGBString2 => {
  const { r = 0, g = 0, b = 0 } = parseToRgb(string)
  return `rgb(${r} ${g} ${b})`
}

export const parseToRgbArray = (string: string): RGBArray => {
  const { r = 0, g = 0, b = 0 } = parseToRgb(string)
  return [r, g, b]
}

export const parseToRgba = (string: string): RGBA => {
  if (isColorName(string)) return parseToRgba(COLOR_NAMES[string])
  if (isHex(string)) {
    const { r, g, b, a = 1 } = hex(string) as RGBA
    return { r, g, b, a }
  }

  if (isRGBString(string)) return { ...rgb(string), a: 1 }
  if (isRGBAString(string)) return rgba(string)

  if (isHSLString(string)) {
    const { h, s, l } = hsl(string)
    return hslToRgb(h, s, l, 1)
  }

  if (isHSLAString(string)) {
    const { h, s, l, a } = hsla(string)
    return hslToRgb(h, s, l, a)
  }

  return { r: 0, g: 0, b: 0, a: 1 }
}

export const parseToRgbaString = (string: string): RGBAString2 => {
  const { r = 0, g = 0, b = 0, a = 1 } = parseToRgba(string)
  return `rgb(${r} ${g} ${b} / ${a})`
}

export const parseToRgbaArray = (string: string): RGBAArray => {
  const { r = 0, g = 0, b = 0, a = 1 } = parseToRgba(string)
  return [r, g, b, a]
}

export const parseToHsl = (string: string): HSL => {
  const { r = 0, g = 0, b = 0 } = parseToRgb(string)
  return rgbToHsl(r, g, b)
}

export const parseToHslString = (string: string): HSLString2 => {
  const { h = 0, s = 0, l = 0 } = parseToHsl(string)
  return `hsl(${h} ${s * 100}% ${l * 100}%)`
}

export const parseToHslArray = (string: string): [number, number, number] => {
  const { h = 0, s = 0, l = 0 } = parseToHsl(string)
  return [h, s, l]
}

export const parseToHsla = (string: string): HSLA => {
  const { r = 0, g = 0, b = 0, a = 1 } = parseToRgba(string)
  return rgbToHsl(r, g, b, a)
}

export const parseToHslaString = (string: string): HSLAString2 => {
  const { h = 0, s = 0, l = 0, a = 1 } = parseToHsla(string)
  return `hsl(${h} ${s * 100}% ${l * 100}% / ${a})`
}

export const parseToHslaArray = (string: string): [number, number, number, number] => {
  const { h = 0, s = 0, l = 0, a = 1 } = parseToHsla(string)
  return [h, s, l, a]
}

export const parseToHsv = (string: string): HSV => {
  const { r = 0, g = 0, b = 0 } = parseToRgb(string)
  return rgbToHsv(r, g, b)
}

export const parseToHsvArray = (string: string): [number, number, number] => {
  const { h = 0, s = 0, v = 0 } = parseToHsv(string)
  return [h, s, v]
}

export const parseToHsva = (string: string): HSVA => {
  const { r = 0, g = 0, b = 0, a = 1 } = parseToRgba(string)
  return rgbToHsv(r, g, b, a) 
}

export const parseToHsvaArray = (string: string): [number, number, number, number] => {
  const { h = 0, s = 0, v = 0, a = 1 } = parseToHsva(string)
  return [h, s, v, a]
}

export const parseToHex = (string: string, forceAlpha: boolean = true): Hex => {
  const { r = 0, g = 0, b = 0, a = 1 } = parseToRgba(string)

  const rc = Math.min(Math.max(r, 0), 255)
  const gc = Math.min(Math.max(g, 0), 255)
  const bc = Math.min(Math.max(b, 0), 255)
  const ac = Math.min(Math.max(a, 0), 1) * 255

  const rs = rc.toString(16).padStart(2, '0')
  const gs = gc.toString(16).padStart(2, '0')
  const bs = bc.toString(16).padStart(2, '0')
  const as = ac.toString(16).padStart(2, '0')

  return `#${rs}${gs}${bs}${forceAlpha ? as : `${ac !== 1 ? as : ''}`}`
}

export const alpha = (string: string, defaultValue: number): number => {
  const { a } = parseToRgba(string)
  return a !== undefined ? a : defaultValue
}

export const setAlpha = (string: string, alpha: number): RGBA => {
  const { r, g, b } = parseToRgb(string)
  const a = Math.min(Math.max(alpha, 0), 1)
  return { r, g, b, a }
}

export const PARSERS = {
  hex,
  hex3,
  hex6,
  hex8,
  rgb,
  rgba,
  hsl,
  hsla,
  alpha,
  parseAngle,
  toHex: parseToHex,
  toRgb: parseToRgb,
  toRgbString: parseToRgbString,
  toRgbArray: parseToRgbArray,
  toRgba: parseToRgba,
  toRgbaString: parseToRgbaString,
  toRgbaArray: parseToRgbaArray,
  toHsl: parseToHsl,
  toHslString: parseToHslString,
  toHslArray: parseToHslArray,
  toHsla: parseToHsla,
  toHslaString: parseToHslaString,
  toHslaArray: parseToHslaArray,
  toHsv: parseToHsv,
  toHsvArray: parseToHsvArray,
  toHsva: parseToHsva,
  toHsvaArray: parseToHsvaArray,
}