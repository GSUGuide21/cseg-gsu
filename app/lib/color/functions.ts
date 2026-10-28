import { 
  parseToRgb, 
  parseToRgba 
} from './parsers'
import { 
  rgbToHsl,
  hslToRgb 
} from './converters'
import type { RGB } from './types'

export const mix = (color1: string, color2: string, weight: number): RGB => {
  const rgb1 = parseToRgb(color1)
  const rgb2 = parseToRgb(color2)

  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * weight)
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * weight)
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * weight)

  return { r, g, b }
}

export const darken = (color: string, percentage: number): RGB => {
  const rgbColor = parseToRgb(color)
  const hslColor = rgbToHsl(rgbColor.r, rgbColor.g, rgbColor.b)

  // Decrease the lightness by the percentage
  // Ensure the lightness does not go below 0%
  const l = Math.max(hslColor.l - (percentage / 100), 0)

  return hslToRgb(hslColor.h, hslColor.s, l)
}

export const lighten = (color: string, percentage: number): RGB => {
  const rgbColor = parseToRgb(color)
  const hslColor = rgbToHsl(rgbColor.r, rgbColor.g, rgbColor.b)

  // Increase the lightness by the percentage
  // Ensure the lightness does not exceed 100%
  const l = Math.min(hslColor.l + (percentage / 100), 1)
  
  // Convert back to RGB
  return hslToRgb(hslColor.h, hslColor.s, l)
}

export const saturate = (color: string, percentage: number): RGB => {
  const rgbColor = parseToRgb(color)
  const r = Math.round(rgbColor.r * (1 + percentage / 100))
  const g = Math.round(rgbColor.g * (1 + percentage / 100))
  const b = Math.round(rgbColor.b * (1 + percentage / 100))

  return { r, g, b }
}

export const desaturate = (color: string, percentage: number): RGB => {
  const rgbColor = parseToRgb(color)
  const r = Math.round(rgbColor.r * (1 - percentage / 100))
  const g = Math.round(rgbColor.g * (1 - percentage / 100))
  const b = Math.round(rgbColor.b * (1 - percentage / 100))

  return { r, g, b }
}

export const rotate = (color: string, angle: number): RGB => {
  const { r, g, b } = parseToRgb(color)
  const hslColor = rgbToHsl(r, g, b)
  const h = (hslColor.h + angle) % 360
  const s = hslColor.s
  const l = hslColor.l

  return hslToRgb(h, s, l)
}

export const blend = (color1: string, color2: string, percentage: number): RGB => {
  const rgb1 = parseToRgb(color1)
  const rgb2 = parseToRgb(color2)

  const r = Math.round(rgb1.r * (1 - percentage / 100) + rgb2.r * (percentage / 100))
  const g = Math.round(rgb1.g * (1 - percentage / 100) + rgb2.g * (percentage / 100))
  const b = Math.round(rgb1.b * (1 - percentage / 100) + rgb2.b * (percentage / 100))

  return { r, g, b }
}

export const tint = (color: string, percentage: number): RGB => {
  const rgbColor = parseToRgb(color)
  const r = Math.round(rgbColor.r + (255 - rgbColor.r) * (percentage / 100))
  const g = Math.round(rgbColor.g + (255 - rgbColor.g) * (percentage / 100))
  const b = Math.round(rgbColor.b + (255 - rgbColor.b) * (percentage / 100))

  return { r, g, b }
}

export const invert = (color: string): RGB => {
  const rgbColor = parseToRgb(color)
  const r = 255 - rgbColor.r
  const g = 255 - rgbColor.g
  const b = 255 - rgbColor.b

  return { r, g, b }
}

export const grayscale = (color: string): RGB => {
  const rgbColor = parseToRgb(color)
  const avg = Math.round((rgbColor.r + rgbColor.g + rgbColor.b) / 3)
  return { r: avg, g: avg, b: avg }
}

export const sepia = (color: string): RGB => {
  const rgbColor = parseToRgb(color)
  const r = Math.round(rgbColor.r * 0.393 + rgbColor.g * 0.769 + rgbColor.b * 0.189)
  const g = Math.round(rgbColor.r * 0.349 + rgbColor.g * 0.686 + rgbColor.b * 0.168)
  const b = Math.round(rgbColor.r * 0.272 + rgbColor.g * 0.534 + rgbColor.b * 0.131)

  return { r, g, b }
}

export const contrast = (color: string, percentage: number): RGB => {
  const rgbColor = parseToRgb(color)
  const r = Math.round(rgbColor.r * (1 + percentage / 100))
  const g = Math.round(rgbColor.g * (1 + percentage / 100))
  const b = Math.round(rgbColor.b * (1 + percentage / 100))

  return { r, g, b }
}

export const shade = (color: string, percentage: number): RGB => {
  const rgbColor = parseToRgb(color)
  const r = Math.round(rgbColor.r * (1 - percentage / 100))
  const g = Math.round(rgbColor.g * (1 - percentage / 100))
  const b = Math.round(rgbColor.b * (1 - percentage / 100))

  return { r, g, b }
}

export const normalize = (color: string): RGB => {
  const rgbColor = parseToRgb(color)
  const r = Math.min(Math.max(rgbColor.r, 0), 255) / 255
  const g = Math.min(Math.max(rgbColor.g, 0), 255) / 255
  const b = Math.min(Math.max(rgbColor.b, 0), 255) / 255

  return { r, g, b }
}

export const complement = (color: string): RGB => {
  const rgbColor = parseToRgb(color)
  const hslColor = rgbToHsl(rgbColor.r, rgbColor.g, rgbColor.b)
  const h = (hslColor.h + 180) % 360
  const s = hslColor.s
  const l = hslColor.l

  return hslToRgb(h, s, l)
}

export const isDark = (color: string): boolean => {
  const rgbColor = parseToRgb(color)
  const luminance = (0.299 * rgbColor.r + 0.587 * rgbColor.g + 0.114 * rgbColor.b) / 255
  return luminance < 0.5
}

export const isLight = (color: string): boolean => {
  return !isDark(color)
}

export const isTransparent = (color: string): boolean => {
  const rgbaColor = parseToRgba(color)
  return rgbaColor.a === 0
}
