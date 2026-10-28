export type RGBA = {
  r: number
  g: number
  b: number
  a: number
}
export type RGB = Omit<RGBA, 'a'>
export type RGBString = `rgb(${number}, ${number}, ${number})`
export type RGBString2 = `rgb(${number} ${number} ${number})`
export type RGBPercent = `rgb(${number}%, ${number}%, ${number}%)`
export type RGBAString = `rgba(${number}, ${number}, ${number}, ${number})`
export type RGBAString2 = `rgb(${number} ${number} ${number} / ${number})`
export type RGBAString3 = `rgb(${number} ${number} ${number} / ${number}%)`
export type RGBAPercent = `rgba(${number}%, ${number}%, ${number}%, ${number})`
export type RGBAPercent2 = `rgb(${number}% ${number}% ${number}% / ${number})`
export type RGBAPercent3 = `rgba(${number}% ${number}% ${number}% / ${number}%)`
export type RGBArray = [number, number, number]
export type RGBAArray = [number, number, number, number]

export type HSLA = {
  h: number
  s: number
  l: number
  a: number
}
export type HSL = Omit<HSLA, 'a'>
export type HSLString = `hsl(${number}, ${number}%, ${number}%)`
export type HSLString2 = `hsl(${number} ${number}% ${number}%)`
export type HSLAString = `hsla(${number}, ${number}%, ${number}%, ${number})`
export type HSLAString2 = `hsl(${number} ${number}% ${number}% / ${number})`
export type HSLArray = [number, number, number]
export type HSLAArray = [number, number, number, number]

export type HSVA = {
  h: number
  s: number
  v: number
  a: number
}
export type HSV = Omit<HSVA, 'a'>
export type HSVAArray = [number, number, number, number]
export type HSVArray = [number, number, number]

export type Hex = `#${string}`

export type Color = 
  | RGBA 
  | RGB 
  | HSLA 
  | HSL 
  | HSVA 
  | HSV 
  | Hex

export type ColorString = 
  | RGBString 
  | RGBString2
  | RGBPercent
  | RGBAString 
  | RGBAString2
  | RGBAPercent
  | RGBAPercent2
  | RGBAPercent3
  | HSLString 
  | HSLString2
  | HSLAString 
  | HSLAString2
  | Hex