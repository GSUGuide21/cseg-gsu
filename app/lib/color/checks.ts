import type {
  Color,
  RGB,
  RGBA,
  HSL,
  HSLA,
  HSV,
  HSVA,
  Hex,
  RGBString,
  HSLString,
  RGBAString,
  HSLAString
} from './types'
import { PATTERNS } from './patterns'

export const isHex3 = (color: Color | string): color is Hex => {
  return typeof color === "string" && PATTERNS.HEX3.test(color)
}

export const isHex6 = (color: Color | string): color is Hex => {
  return typeof color === "string" && PATTERNS.HEX6.test(color)
}

export const isHex8 = (color: Color | string): color is Hex => {
  return typeof color === "string" && PATTERNS.HEX8.test(color)
}

export const isHex = (color: Color | string): color is Hex => {
  return isHex3(color) || isHex6(color) || isHex8(color)
}

export const isRGB = (color: Color): color is RGB => {
  return typeof color === "object" && 
    "r" in color && 
    "g" in color && 
    "b" in color
}

export const isRGBString = (string: string): string is RGBString => {
  return typeof string === "string" && (
    PATTERNS.RGB.test(string) ||
    PATTERNS.RGB2.test(string) ||
    PATTERNS.RGBPercent.test(string) ||
    PATTERNS.RGBPercent2.test(string)
  )
}

export const isRGBAString = (string: string): string is RGBAString => {
  return isRGBString(string) ||
    PATTERNS.RGBA.test(string) ||
    PATTERNS.RGBA2.test(string) ||
    PATTERNS.RGBA3.test(string) ||
    PATTERNS.RGBAPercent.test(string) ||
    PATTERNS.RGBAPercent2.test(string) ||
    PATTERNS.RGBAPercent3.test(string) ||
    PATTERNS.RGBAPercent4.test(string)
}

export const isRGBA = (color: Color): color is RGBA => {
  return isRGB(color) && "a" in color
}

export const isHSL = (color: Color): color is HSL => {
  return typeof color === "object" &&
    "h" in color && 
    "s" in color && 
    "l" in color
}

export const isHSLString = (string: string): string is HSLString => {
  return typeof string === "string" && (
    PATTERNS.HSL.test(string) ||
    PATTERNS.HSL2.test(string) ||
    PATTERNS.HSL3.test(string) ||
    PATTERNS.HSL4.test(string)
  )
}

export const isHSLAString = (string: string): string is HSLAString => {
  return isHSLString(string) ||
    PATTERNS.HSLA.test(string) ||
    PATTERNS.HSLA2.test(string) ||
    PATTERNS.HSLA3.test(string) ||
    PATTERNS.HSLA4.test(string) ||
    PATTERNS.HSLA5.test(string) ||
    PATTERNS.HSLA6.test(string) ||
    PATTERNS.HSLA7.test(string) ||
    PATTERNS.HSLA8.test(string) 
}

export const isHSLA = (color: Color): color is HSLA => {
  return isHSL(color) && "a" in color
}

export const isHSV = (color: Color): color is HSV => {
  return typeof color === "object" &&
    "h" in color && 
    "s" in color && 
    "v" in color
}

export const isHSVA = (color: Color): color is HSVA => {
  return isHSV(color) && "a" in color
}