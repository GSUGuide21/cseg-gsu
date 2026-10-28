export const ROOT_FONT_SIZE = 16
export const ROOT_LINE_HEIGHT = 1.5
export const ROOT_LETTER_SPACING = 0.5

export const emToPx = (em: number, fontSize: number = ROOT_FONT_SIZE): number => {
  return em * fontSize
}

export const emToRem = (em: number, fontSize: number = ROOT_FONT_SIZE): number => {
  return (em * fontSize) / ROOT_FONT_SIZE
}

export const emToPercent = (em: number, baseSize: number = 1024, fontSize: number = ROOT_FONT_SIZE): number => {
  return ((em * fontSize) / baseSize) * 100
}

export const emToVw = (em: number, fontSize: number = ROOT_FONT_SIZE): number => {
  return ((em * fontSize) / window.innerWidth) * 100
}

export const emToSvw = (em: number, fontSize: number = ROOT_FONT_SIZE): number => {
  const viewportWidth = Math.min(window.innerWidth, window.innerHeight)
  return ((em * fontSize) / viewportWidth) * 100
}

export const emToLvw = (em: number, fontSize: number = ROOT_FONT_SIZE): number => {
  const viewportWidth = Math.max(window.innerWidth, window.innerHeight)
  return ((em * fontSize) / viewportWidth) * 100
}

export const emToDvw = (em: number, fontSize: number = ROOT_FONT_SIZE): number => {
  const viewportWidth = Math.hypot(window.innerWidth, window.innerHeight)
  return ((em * fontSize) / viewportWidth) * 100
}

export const emToVh = (em: number, fontSize: number = ROOT_FONT_SIZE): number => {
  return ((em * fontSize) / window.innerHeight) * 100
}

export const emToSvh = (em: number, fontSize: number = ROOT_FONT_SIZE): number => {
  const viewportHeight = Math.min(window.innerWidth, window.innerHeight)
  return ((em * fontSize) / viewportHeight) * 100
}

export const emToLvh = (em: number, fontSize: number = ROOT_FONT_SIZE): number => {
  const viewportHeight = Math.max(window.innerWidth, window.innerHeight)
  return ((em * fontSize) / viewportHeight) * 100
}

export const emToDvh = (em: number, fontSize: number = ROOT_FONT_SIZE): number => {
  const viewportHeight = Math.hypot(window.innerWidth, window.innerHeight)
  return ((em * fontSize) / viewportHeight) * 100
}

export const emToCm = (em: number, fontSize: number = ROOT_FONT_SIZE): number => {
  return ((em * fontSize) / 96) * 2.54
}

export const emToMm = (em: number, fontSize: number = ROOT_FONT_SIZE): number => {
  return ((em * fontSize) / 96) * 25.4
}

export const emToIn = (em: number, fontSize: number = ROOT_FONT_SIZE): number => {
  return ((em * fontSize) / 96)
}

export const emToPt = (em: number, fontSize: number = ROOT_FONT_SIZE): number => {
  return ((em * fontSize) / 96) * 72
}

export const emToPc = (em: number, fontSize: number = ROOT_FONT_SIZE): number => {
  return ((em * fontSize) / 96) * 6
}

export const emToLh = (em: number, fontSize: number = ROOT_FONT_SIZE, lineHeight: number = ROOT_LINE_HEIGHT): number => {
  return ((em * fontSize) / 96) * lineHeight
}

export const emToRlh = (em: number, fontSize: number = ROOT_FONT_SIZE): number => {
  return ((em * fontSize) / 96) * ROOT_LINE_HEIGHT
}

export const pxToEm = (px: number, fontSize: number = ROOT_FONT_SIZE): number => {
  return px / fontSize
}

export const pxToPercent = (px: number, baseSize: number = 1024): number => {
  return (px / baseSize) * 100
}

export const pxToVw = (px: number): number => {
  return (px / window.innerWidth) * 100
}

export const pxToSvw = (px: number): number => {
  const viewportWidth = Math.min(window.innerWidth, window.innerHeight)
  return (px / viewportWidth) * 100
}

export const pxToLvw = (px: number): number => {
  const viewportWidth = Math.max(window.innerWidth, window.innerHeight)
  return (px / viewportWidth) * 100
}

export const pxToDvw = (px: number): number => {
  const viewportWidth = Math.hypot(window.innerWidth, window.innerHeight)
  return (px / viewportWidth) * 100
}

export const pxToVh = (px: number): number => {
  return (px / window.innerHeight) * 100
}

export const pxToSvh = (px: number): number => {
  const viewportHeight = Math.min(window.innerWidth, window.innerHeight)
  return (px / viewportHeight) * 100
}

export const pxToLvh = (px: number): number => {
  const viewportHeight = Math.max(window.innerWidth, window.innerHeight)
  return (px / viewportHeight) * 100
}

export const pxToDvh = (px: number): number => {
  const viewportHeight = Math.hypot(window.innerWidth, window.innerHeight)
  return (px / viewportHeight) * 100
}

export const pxToRem = (px: number): number => {
  return px / ROOT_FONT_SIZE
}

export const pxToCm = (px: number): number => {
  return (px / 96) * 2.54
}

export const pxToMm = (px: number): number => {
  return (px / 96) * 25.4
}

export const pxToIn = (px: number): number => {
  return px / 96
}

export const pxToPt = (px: number): number => {
  return (px / 96) * 72
}

export const pxToPc = (px: number): number => {
  return (px / 96) * 6
}

export const pxToLh = (px: number, lineHeight: number = ROOT_LINE_HEIGHT): number => {
  return (px / 96) * lineHeight
}

export const pxToRlh = (px: number): number => {
  return (px / 96) * ROOT_LINE_HEIGHT
}

export const remToPx = (rem: number): number => {
  return rem * ROOT_FONT_SIZE
}

export const remToPercent = (rem: number, baseSize: number = 1024): number => {
  return (rem * ROOT_FONT_SIZE) / baseSize
}

export const remToVw = (rem: number): number => {
  return (rem * ROOT_FONT_SIZE) / window.innerWidth
}

export const remToSvw = (rem: number): number => {
  const viewportWidth = Math.min(window.innerWidth, window.innerHeight)
  return (rem * ROOT_FONT_SIZE) / viewportWidth
}

export const remToLvw = (rem: number): number => {
  const viewportWidth = Math.max(window.innerWidth, window.innerHeight)
  return (rem * ROOT_FONT_SIZE) / viewportWidth
}

export const remToDvw = (rem: number): number => {
  const viewportWidth = Math.hypot(window.innerWidth, window.innerHeight)
  return (rem * ROOT_FONT_SIZE) / viewportWidth
}

export const remToVh = (rem: number): number => {
  return (rem * ROOT_FONT_SIZE) / window.innerHeight
}

export const remToSvh = (rem: number): number => {
  const viewportHeight = Math.min(window.innerWidth, window.innerHeight)
  return (rem * ROOT_FONT_SIZE) / viewportHeight
}

export const remToLvh = (rem: number): number => {
  const viewportHeight = Math.max(window.innerWidth, window.innerHeight)
  return (rem * ROOT_FONT_SIZE) / viewportHeight
}

export const remToDvh = (rem: number): number => {
  const viewportHeight = Math.hypot(window.innerWidth, window.innerHeight)
  return (rem * ROOT_FONT_SIZE) / viewportHeight
}

export const remToCm = (rem: number): number => {
  return (rem * ROOT_FONT_SIZE) / 96 * 2.54
}

export const remToMm = (rem: number): number => {
  return (rem * ROOT_FONT_SIZE) / 96 * 25.4
}

export const remToIn = (rem: number): number => {
  return (rem * ROOT_FONT_SIZE) / 96
}

export const remToPt = (rem: number): number => {
  return (rem * ROOT_FONT_SIZE) / 96 * 72
}

export const remToPc = (rem: number): number => {
  return (rem * ROOT_FONT_SIZE) / 96 * 6
}

export const remToLh = (rem: number, lineHeight: number = ROOT_LINE_HEIGHT): number => {
  return (rem * ROOT_FONT_SIZE) / 96 * lineHeight
}

export const remToRlh = (rem: number): number => {
  return (rem * ROOT_FONT_SIZE) / 96 * ROOT_LINE_HEIGHT
}

export const percentToEm = (percent: number, baseSize: number = 1024, fontSize: number = ROOT_FONT_SIZE): number => {
  return (percent / 100) * baseSize / fontSize
}

export const percentToPx = (percent: number, baseSize: number = 1024): number => {
  return (percent / 100) * baseSize
}

export const percentToVw = (percent: number): number => {
  return (percent / 100) * window.innerWidth
}

export const percentToSvw = (percent: number): number => {
  const viewportWidth = Math.min(window.innerWidth, window.innerHeight)
  return (percent / 100) * viewportWidth
}

export const percentToLvw = (percent: number): number => {
  const viewportWidth = Math.max(window.innerWidth, window.innerHeight)
  return (percent / 100) * viewportWidth
}

export const percentToDvw = (percent: number): number => {
  const viewportWidth = Math.hypot(window.innerWidth, window.innerHeight)
  return (percent / 100) * viewportWidth
}

export const percentToVh = (percent: number): number => {
  return (percent / 100) * window.innerHeight
}

export const percentToSvh = (percent: number): number => {
  const viewportHeight = Math.min(window.innerWidth, window.innerHeight)
  return (percent / 100) * viewportHeight
}

export const percentToLvh = (percent: number): number => {
  const viewportHeight = Math.max(window.innerWidth, window.innerHeight)
  return (percent / 100) * viewportHeight
}

export const percentToDvh = (percent: number): number => {
  const viewportHeight = Math.hypot(window.innerWidth, window.innerHeight)
  return (percent / 100) * viewportHeight
}

export const percentToRem = (percent: number): number => {
  return (percent / 100) * ROOT_FONT_SIZE
}

export const percentToCm = (percent: number, baseSize: number = 1024): number => {
  return (percent / 100) * baseSize / 96 * 2.54
}

export const percentToMm = (percent: number, baseSize: number = 1024): number => {
  return (percent / 100) * baseSize / 96 * 25.4
}

export const percentToIn = (percent: number, baseSize: number = 1024): number => {
  return (percent / 100) * baseSize / 96
}

export const percentToPt = (percent: number, baseSize: number = 1024): number => {
  return (percent / 100) * baseSize / 96 * 72
}

export const percentToPc = (percent: number, baseSize: number = 1024): number => {
  return (percent / 100) * baseSize / 96 * 6
}

export const percentToLh = (percent: number, baseSize: number = 1024, lineHeight: number = ROOT_LINE_HEIGHT): number => {
  return (percent / 100) * baseSize / 96 * lineHeight
}

export const percentToRlh = (percent: number, baseSize: number = 1024): number => {
  return (percent / 100) * baseSize / 96 * ROOT_LINE_HEIGHT
}

export const vwToEm = (vw: number, fontSize: number = ROOT_FONT_SIZE): number => {
  return (vw / 100) * window.innerWidth / fontSize
}

export const vwToPx = (vw: number): number => {
  return (vw / 100) * window.innerWidth
}

export const vwToPercent = (vw: number): number => {
  return vw
}

export const vwToSvw = (vw: number): number => {
  const viewportWidth = Math.min(window.innerWidth, window.innerHeight)
  return (vw / 100) * viewportWidth
}

export const vwToLvw = (vw: number): number => {
  const viewportWidth = Math.max(window.innerWidth, window.innerHeight)
  return (vw / 100) * viewportWidth
}

export const vwToDvw = (vw: number): number => {
  const viewportWidth = Math.hypot(window.innerWidth, window.innerHeight)
  return (vw / 100) * viewportWidth
}

export const vwToVh = (vw: number): number => {
  return (vw / 100) * window.innerHeight
}

export const vwToSvh = (vw: number): number => {
  const viewportHeight = Math.min(window.innerWidth, window.innerHeight)
  return (vw / 100) * viewportHeight
}

export const vwToLvh = (vw: number): number => {
  const viewportHeight = Math.max(window.innerWidth, window.innerHeight)
  return (vw / 100) * viewportHeight
}

export const vwToDvh = (vw: number): number => {
  const viewportHeight = Math.hypot(window.innerWidth, window.innerHeight)
  return (vw / 100) * viewportHeight
}

export const vwToRem = (vw: number): number => {
  return (vw / 100) * ROOT_FONT_SIZE
}

export const vwToCm = (vw: number): number => {
  return (vw / 100) * window.innerWidth / 96 * 2.54
}

export const vwToMm = (vw: number): number => {
  return (vw / 100) * window.innerWidth / 96 * 25.4
}

export const vwToIn = (vw: number): number => {
  return (vw / 100) * window.innerWidth / 96
}

export const vwToPt = (vw: number): number => {
  return (vw / 100) * window.innerWidth / 96 * 72
}

export const vwToPc = (vw: number): number => {
  return (vw / 100) * window.innerWidth / 96 * 6
}

export const vwToLh = (vw: number, lineHeight: number = ROOT_LINE_HEIGHT): number => {
  return (vw / 100) * window.innerWidth / 96 * lineHeight
}

export const vwToRlh = (vw: number): number => {
  return (vw / 100) * window.innerWidth / 96 * ROOT_LINE_HEIGHT
}

export const svwToEm = (svw: number, fontSize: number = ROOT_FONT_SIZE): number => {
  const viewportWidth = Math.min(window.innerWidth, window.innerHeight)
  return (svw / 100) * viewportWidth / fontSize
}

export const svwToPx = (svw: number): number => {
  const viewportWidth = Math.min(window.innerWidth, window.innerHeight)
  return (svw / 100) * viewportWidth
}

export const svwToPercent = (svw: number): number => {
  return svw
}

export const svwToVw = (svw: number): number => {
  return (svw / 100) * window.innerWidth
}

export const svwToLvw = (svw: number): number => {
  const viewportWidth = Math.max(window.innerWidth, window.innerHeight)
  return (svw / 100) * viewportWidth
}

export const svwToDvw = (svw: number): number => {
  const viewportWidth = Math.hypot(window.innerWidth, window.innerHeight)
  return (svw / 100) * viewportWidth
}

export const svwToVh = (svw: number): number => {
  return (svw / 100) * window.innerHeight
}

export const svwToSvh = (svw: number): number => {
  const viewportHeight = Math.min(window.innerWidth, window.innerHeight)
  return (svw / 100) * viewportHeight
}

export const svwToLvh = (svw: number): number => {
  const viewportHeight = Math.max(window.innerWidth, window.innerHeight)
  return (svw / 100) * viewportHeight
}

export const svwToDvh = (svw: number): number => {
  const viewportHeight = Math.hypot(window.innerWidth, window.innerHeight)
  return (svw / 100) * viewportHeight
}

export const svwToRem = (svw: number): number => {
  return (svw / 100) * ROOT_FONT_SIZE
}

export const svwToCm = (svw: number): number => {
  const viewportWidth = Math.min(window.innerWidth, window.innerHeight)
  return (svw / 100) * viewportWidth / 96 * 2.54
}

export const svwToMm = (svw: number): number => {
  const viewportWidth = Math.min(window.innerWidth, window.innerHeight)
  return (svw / 100) * viewportWidth / 96 * 25.4
}

export const svwToIn = (svw: number): number => {
  const viewportWidth = Math.min(window.innerWidth, window.innerHeight)
  return (svw / 100) * viewportWidth / 96
}

export const svwToPt = (svw: number): number => {
  const viewportWidth = Math.min(window.innerWidth, window.innerHeight)
  return (svw / 100) * viewportWidth / 96 * 72
}

export const svwToPc = (svw: number): number => {
  const viewportWidth = Math.min(window.innerWidth, window.innerHeight)
  return (svw / 100) * viewportWidth / 96 * 6
}

export const svwToLh = (svw: number, lineHeight: number = ROOT_LINE_HEIGHT): number => {
  const viewportWidth = Math.min(window.innerWidth, window.innerHeight)
  return (svw / 100) * viewportWidth / 96 * lineHeight
}

export const svwToRlh = (svw: number): number => {
  const viewportWidth = Math.min(window.innerWidth, window.innerHeight)
  return (svw / 100) * viewportWidth / 96 * ROOT_LINE_HEIGHT
}

export const lvwToEm = (lvw: number, fontSize: number = ROOT_FONT_SIZE): number => {
  const viewportWidth = Math.max(window.innerWidth, window.innerHeight)
  return (lvw / 100) * viewportWidth / fontSize
}

export const lvwToPx = (lvw: number): number => {
  const viewportWidth = Math.max(window.innerWidth, window.innerHeight)
  return (lvw / 100) * viewportWidth
}

export const lvwToPercent = (lvw: number): number => {
  return lvw
}

export const lvwToVw = (lvw: number): number => {
  return (lvw / 100) * window.innerWidth
}

export const lvwToSvw = (lvw: number): number => {
  const viewportWidth = Math.min(window.innerWidth, window.innerHeight)
  return (lvw / 100) * viewportWidth
}

export const lvwToDvw = (lvw: number): number => {
  const viewportWidth = Math.hypot(window.innerWidth, window.innerHeight)
  return (lvw / 100) * viewportWidth
}

export const lvwToVh = (lvw: number): number => {
  return (lvw / 100) * window.innerHeight
}

export const lvwToSvh = (lvw: number): number => {
  const viewportHeight = Math.min(window.innerWidth, window.innerHeight)
  return (lvw / 100) * viewportHeight
}

export const lvwToLvh = (lvw: number): number => {
  const viewportHeight = Math.max(window.innerWidth, window.innerHeight)
  return (lvw / 100) * viewportHeight
}

export const lvwToDvh = (lvw: number): number => {
  const viewportHeight = Math.hypot(window.innerWidth, window.innerHeight)
  return (lvw / 100) * viewportHeight
}

export const lvwToRem = (lvw: number): number => {
  return (lvw / 100) * ROOT_FONT_SIZE
}

export const lvwToCm = (lvw: number): number => {
  const viewportWidth = Math.max(window.innerWidth, window.innerHeight)
  return (lvw / 100) * viewportWidth / 96 * 2.54
}

export const lvwToMm = (lvw: number): number => {
  const viewportWidth = Math.max(window.innerWidth, window.innerHeight)
  return (lvw / 100) * viewportWidth / 96 * 25.4
}

export const lvwToIn = (lvw: number): number => {
  const viewportWidth = Math.max(window.innerWidth, window.innerHeight)
  return (lvw / 100) * viewportWidth / 96
}

export const lvwToPt = (lvw: number): number => {
  const viewportWidth = Math.max(window.innerWidth, window.innerHeight)
  return (lvw / 100) * viewportWidth / 96 * 72
}

export const lvwToPc = (lvw: number): number => {
  const viewportWidth = Math.max(window.innerWidth, window.innerHeight)
  return (lvw / 100) * viewportWidth / 96 * 6
}

export const lvwToLh = (lvw: number, lineHeight: number = ROOT_LINE_HEIGHT): number => {
  const viewportWidth = Math.max(window.innerWidth, window.innerHeight)
  return (lvw / 100) * viewportWidth / 96 * lineHeight
}

export const lvwToRlh = (lvw: number): number => {
  const viewportWidth = Math.max(window.innerWidth, window.innerHeight)
  return (lvw / 100) * viewportWidth / 96 * ROOT_LINE_HEIGHT
}

export const dvwToEm = (dvw: number, fontSize: number = ROOT_FONT_SIZE): number => {
  const viewportWidth = Math.hypot(window.innerWidth, window.innerHeight)
  return (dvw / 100) * viewportWidth / fontSize
}

export const dvwToPx = (dvw: number): number => {
  const viewportWidth = Math.hypot(window.innerWidth, window.innerHeight)
  return (dvw / 100) * viewportWidth
}

export const dvwToPercent = (dvw: number): number => {
  return dvw
}

export const dvwToVw = (dvw: number): number => {
  return (dvw / 100) * window.innerWidth
}

export const dvwToSvw = (dvw: number): number => {
  const viewportWidth = Math.min(window.innerWidth, window.innerHeight)
  return (dvw / 100) * viewportWidth
}

export const dvwToLvw = (dvw: number): number => {
  const viewportWidth = Math.max(window.innerWidth, window.innerHeight)
  return (dvw / 100) * viewportWidth
}

export const dvwToVh = (dvw: number): number => {
  return (dvw / 100) * window.innerHeight
}

export const dvwToSvh = (dvw: number): number => {
  const viewportHeight = Math.min(window.innerWidth, window.innerHeight)
  return (dvw / 100) * viewportHeight
}

export const dvwToLvh = (dvw: number): number => {
  const viewportHeight = Math.max(window.innerWidth, window.innerHeight)
  return (dvw / 100) * viewportHeight
}

export const dvwToDvh = (dvw: number): number => {
  const viewportHeight = Math.hypot(window.innerWidth, window.innerHeight)
  return (dvw / 100) * viewportHeight
}

export const dvwToRem = (dvw: number): number => {
  return (dvw / 100) * ROOT_FONT_SIZE
}

export const dvwToCm = (dvw: number): number => {
  const viewportWidth = Math.hypot(window.innerWidth, window.innerHeight)
  return (dvw / 100) * viewportWidth / 96 * 2.54
}

export const dvwToMm = (dvw: number): number => {
  const viewportWidth = Math.hypot(window.innerWidth, window.innerHeight)
  return (dvw / 100) * viewportWidth / 96 * 25.4
}

export const dvwToIn = (dvw: number): number => {
  const viewportWidth = Math.hypot(window.innerWidth, window.innerHeight)
  return (dvw / 100) * viewportWidth / 96
}

export const dvwToPt = (dvw: number): number => {
  const viewportWidth = Math.hypot(window.innerWidth, window.innerHeight)
  return (dvw / 100) * viewportWidth / 96 * 72
}

export const dvwToPc = (dvw: number): number => {
  const viewportWidth = Math.hypot(window.innerWidth, window.innerHeight)
  return (dvw / 100) * viewportWidth / 96 * 6
}

export const dvwToLh = (dvw: number, lineHeight: number = ROOT_LINE_HEIGHT): number => {
  const viewportWidth = Math.hypot(window.innerWidth, window.innerHeight)
  return (dvw / 100) * viewportWidth / 96 * lineHeight
}

export const dvwToRlh = (dvw: number): number => {
  const viewportWidth = Math.hypot(window.innerWidth, window.innerHeight)
  return (dvw / 100) * viewportWidth / 96 * ROOT_LINE_HEIGHT
}

export const converters = {
  // Conversions from em
  emToPx,
  emToRem,
  emToPercent,
  emToVw,
  emToSvw,
  emToLvw,
  emToDvw,
  emToVh,
  emToSvh,
  emToLvh,
  emToDvh,
  emToCm,
  emToMm,
  emToIn,
  emToPt,
  emToPc,
  emToLh,
  emToRlh,
  // Conversions from px
  pxToEm,
  pxToPercent,
  pxToVw,
  pxToSvw,
  pxToLvw,
  pxToDvw,
  pxToVh,
  pxToSvh,
  pxToLvh,
  pxToDvh,
  pxToRem,
  pxToCm,
  pxToMm,
  pxToIn,
  pxToPt,
  pxToPc,
  pxToLh,
  pxToRlh,
  // Conversions from rem
  remToPx,
  remToPercent,
  remToVw,
  remToSvw,
  remToLvw,
  remToDvw,
  remToVh,
  remToSvh,
  remToLvh,
  remToDvh,
  remToCm,
  remToMm,
  remToIn,
  remToPt,
  remToPc,
  remToLh,
  remToRlh,
  // Conversions from percent
  percentToEm,
  percentToPx,
  percentToVw,
  percentToSvw,
  percentToLvw,
  percentToDvw,
  percentToVh,
  percentToSvh,
  percentToLvh,
  percentToDvh,
  percentToRem,
  percentToCm,
  percentToMm,
  percentToIn,
  percentToPt,
  percentToPc,
  percentToLh,
  percentToRlh,
  // Conversions from vw
  vwToEm,
  vwToPx,
  vwToPercent,
  vwToSvw,
  vwToLvw,
  vwToDvw,
  vwToVh,
  vwToSvh,
  vwToLvh,
  vwToDvh,
  vwToRem,
  vwToCm,
  vwToMm,
  vwToIn,
  vwToPt,
  vwToPc,
  vwToLh,
  // Conversions from svw
  vwToRlh,
  svwToEm,
  svwToPx,
  svwToPercent,
  svwToVw,
  svwToLvw,
  svwToDvw,
  svwToVh,
  svwToSvh,
  svwToLvh,
  svwToDvh,
  svwToRem,
  svwToCm,
  svwToMm,
  svwToIn,
  svwToPt,
  svwToPc,
  svwToLh,
  svwToRlh,
  // Conversions from lvw
  lvwToEm,
  lvwToPx,
  lvwToPercent,
  lvwToVw,
  lvwToSvw,
  lvwToDvw,
  lvwToVh,
  lvwToSvh,
  lvwToLvh,
  lvwToDvh,
  lvwToRem,
  lvwToCm,
  lvwToMm,
  lvwToIn,
  lvwToPt,
  lvwToPc,
  lvwToLh,
  lvwToRlh,
  // Conversions from dvw
  dvwToEm,
  dvwToPx,
  dvwToPercent,
  dvwToVw,
  dvwToSvw,
  dvwToLvw,
  dvwToVh,
  dvwToSvh,
  dvwToLvh,
  dvwToDvh,
  dvwToRem,
  dvwToCm,
  dvwToMm,
  dvwToIn,
  dvwToPt,
  dvwToPc,
  dvwToLh,
  dvwToRlh
}