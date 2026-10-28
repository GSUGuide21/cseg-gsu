export const HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/ // #fff, #ffffff, #ffffffff
export const HEX3 = /^#([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])$/ // #fff
export const HEX6 = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/ // #ffffff
export const HEX8 = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/ // #ffffffff
export const RGB = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/ // rgb(255, 255, 255)
export const RGB2 = /^rgb\((\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\)$/ // rgb(255 255 255)
export const RGBPercent = /^rgb\((\d{1,3})%,\s*(\d{1,3})%,\s*(\d{1,3})%\)$/ // rgb(100%, 100%, 100%)
export const RGBPercent2 = /^rgb\((\d{1,3})%\s+(\d{1,3})%\s+(\d{1,3})%\)$/ // rgb(100% 100% 100%)
export const RGBA = /^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d*\.?\d+)\)$/ // rgba(255, 255, 255, 1)
export const RGBA2 = /^rgb\((\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+\/\s+(\d*\.?\d+)\)$/ // rgb(255 255 255 / 1)
export const RGBA3 = /^rgb(?:a|)\((\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+\/\s+(\d{1,3})%\)$/ // rgba(255 255 255 / 100%)
export const RGBAPercent = /^rgba\((\d{1,3})%,\s*(\d{1,3})%,\s*(\d{1,3})%,\s*(\d*\.?\d+)\)$/ // rgba(100%, 100%, 100%, 1)
export const RGBAPercent2 = /^rgb\((\d{1,3})%\s+(\d{1,3})%\s+(\d{1,3})%\s+\/\s+(\d*\.?\d+)\)$/ // rgb(100% 100% 100% / 1)
export const RGBAPercent3 = /^rgba\((\d{1,3})%,\s*(\d{1,3})%,\s*(\d{1,3})%,\s*(\d{1,3})%\)$/ // rgba(100%, 100%, 100%, 100%)
export const RGBAPercent4 = /^rgb(?:a|)\((\d{1,3})%\s+(\d{1,3})%\s+(\d{1,3})%\s+\/\s+(\d{1,3})%\)$/ // rgba(100% 100% 100% / 100%)
export const HSL = /^hsl\((\d{1,3}),\s*(\d{1,3})%?,\s*(\d{1,3})%?\)$/ // hsl(360, 100%, 100%)
export const HSL2 = /^hsl\((\d{1,3})\s+(\d{1,3})%?\s+(\d{1,3})%?\)$/ // hsl(360 100% 100%)
export const HSL3 = /^hsl\(([^\s]+),\s*(\d{1,3})%?,\s*(\d{1,3})%?\)$/ // hsl(360deg, 100%, 100%)
export const HSL4 = /^hsl\(([^\s]+)\s+(\d{1,3})%?\s+(\d{1,3})%?\)$/ // hsl(360deg 100% 100%)
export const HSLA = /^hsla\((\d{1,3}),\s*(\d{1,3})%?,\s*(\d{1,3})%?,\s*(\d*\.?\d+)\)$/ // hsla(360, 100%, 100%, 1)
export const HSLA2 = /^hsl\((\d{1,3})\s+(\d{1,3})%?\s+(\d{1,3})%?\s+\/\s+(\d*\.?\d+)\)$/ // hsl(360 100% 100% / 1)
export const HSLA3 = /^hsl(?:a|)\((\d{1,3}),\s*(\d{1,3})%?,\s*(\d{1,3})%?,\s*(\d{1,3})%\)$/ // hsla(360, 100%, 100%, 100%)
export const HSLA4 = /^hsl(?:a|)\((\d{1,3})\s+(\d{1,3})%?\s+(\d{1,3})%?\s+\/\s+(\d{1,3})%\)$/ // hsla(360 100% 100% / 100%)
export const HSLA5 = /^hsl(?:a|)\(([^\s]+),\s*(\d{1,3})%?,\s*(\d{1,3})%?,\s*(\d*\.?\d+)\)$/ // hsla(360deg, 100%, 100%, 1)
export const HSLA6 = /^hsl(?:a|)\(([^\s]+)\s+(\d{1,3})%?\s+(\d{1,3})%?\s+(\d*\.?\d+)\)$/ // hsl(360deg 100% 100% / 1)
export const HSLA7 = /^hsl(?:a|)\(([^\s]+),\s*(\d{1,3})%?,\s*(\d{1,3})%?,\s*(\d{1,3})%\)$/ // hsla(360deg, 100%, 100%, 100%)
export const HSLA8 = /^hsl(?:a|)\(([^\s]+)\s+(\d{1,3})%?\s+(\d{1,3})%?\s+(\d{1,3})%\)$/ // hsl(360deg 100% 100% / 100%)

export const ANGLE = /^(\d+)(deg|turn|rad|grad)$/

export const PATTERNS = {
  HEX,
  HEX3,
  HEX6,
  HEX8,
  RGB,
  RGB2,
  RGBPercent,
  RGBPercent2,
  RGBA,
  RGBA2,
  RGBA3,
  RGBAPercent,
  RGBAPercent2,
  RGBAPercent3,
  RGBAPercent4,
  HSL,
  HSL2,
  HSL3,
  HSL4,
  HSLA,
  HSLA2,
  HSLA3,
  HSLA4,
  HSLA5,
  HSLA6,
  HSLA7,
  HSLA8,
  ANGLE
}