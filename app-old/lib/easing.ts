export const ease = (t: number) => Math.pow(t, 2)

export const easeIn = (t: number) => Math.pow(t, 3)

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

export const easeInOut = (t: number) => {
  if (t < 0.5) return Math.pow(t, 3) * 4
  return 1 - Math.pow(1 - t, 3) * 4
}

export const easeInSine = (t: number) => 1 - Math.cos((t * Math.PI) / 2)

export const easeOutSine = (t: number) => Math.sin((t * Math.PI) / 2)

export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

export const easeInQuad = (t: number) => Math.pow(t, 2)

export const easeOutQuad = (t: number) => 1 - Math.pow(1 - t, 2)

export const easeInOutQuad = (t: number) => {
  if (t < 0.5) return Math.pow(t, 2) * 2
  return 1 - Math.pow(1 - t, 2) * 2
}

export const easeInCubic = (t: number) => Math.pow(t, 3)

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export const easeInOutCubic = (t: number) => {
  if (t < 0.5) return Math.pow(t, 3) * 4
  return 1 - Math.pow(1 - t, 3) * 4
}

export const easeInQuart = (t: number) => Math.pow(t, 4)

export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)

export const easeInOutQuart = (t: number) => {
  if (t < 0.5) return Math.pow(t, 4) * 8
  return 1 - Math.pow(1 - t, 4) * 8
}

export const easeInQuint = (t: number) => Math.pow(t, 5)

export const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5)

export const easeInOutQuint = (t: number) => {
  if (t < 0.5) return Math.pow(t, 5) * 16
  return 1 - Math.pow(1 - t, 5) * 16
}

export const easeInExpo = (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1)))

export const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

export const easeInOutExpo = (t: number) => {
  if (t === 0 || t === 1) return t
  if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2
  return (2 - Math.pow(2, -20 * t + 10)) / 2
}

export const easeInCirc = (t: number) => 1 - Math.sqrt(1 - Math.pow(t, 2))

export const easeOutCirc = (t: number) => Math.sqrt(1 - Math.pow(t - 1, 2))

export const easeInOutCirc = (t: number) => {
  if (t < 0.5) return (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
  return (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2
}

export const easeInBack = (t: number) => {
  const s = 1.70158
  return t * t * ((s + 1) * t - s)
}

export const easeOutBack = (t: number) => {
  const s = 1.70158
  return 1 + t * t * ((s + 1) * t + s)
}

export const easeInOutBack = (t: number) => {
  const s = 1.70158
  if (t < 0.5) return (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2
  return (Math.pow(2 * t - 2, 2) * ((s + 1) * (t * 2 - 2) + s) + 2) / 2
}

export const easeOutBounce = (t: number) => {
  const n1 = 7.5625
  const d1 = 2.75
  if (t < 1 / d1) return n1 * t * t
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
  return n1 * (t -= 2.625 / d1) * t + 0.984375
}

export const easeInBounce = (t: number) => 1 - easeOutBounce(1 - t)

export const easeInOutBounce = (t: number) => {
  if (t < 0.5) return easeInBounce(t * 2) / 2
  return easeOutBounce(t * 2 - 1) / 2 + 0.5
}

export const easeInElastic = (t: number) => {
  const s = 0.1
  const p = 0.4
  if (t === 0 || t === 1) return t
  return -(Math.pow(2, 10 * (t - 1)) * Math.sin((t - s) * (2 * Math.PI) / p))
}

export const easeOutElastic = (t: number) => {
  const s = 0.1
  const p = 0.4
  if (t === 0 || t === 1) return t
  return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1
}

export const easeInOutElastic = (t: number) => {
  // const s = 0.1
  const p = 0.4
  if (t === 0 || t === 1) return t
  if (t < 0.5) return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / p)) / 2
  return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / p)) / 2 + 1
}

export const easeInOutExpo2 = (t: number) => {
  if (t === 0 || t === 1) return t
  if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2
  return (2 - Math.pow(2, -20 * t + 10)) / 2
}

export const easeInOutElastic2 = (t: number) => {
  // const s = 0.1
  const p = 0.4
  if (t === 0 || t === 1) return t
  if (t < 0.5) return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / p)) / 2
  return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / p)) / 2 + 1
}

export const easeInOutBack2 = (t: number) => {
  const s = 1.70158
  if (t < 0.5) return (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2
  return (Math.pow(2 * t - 2, 2) * ((s + 1) * (t * 2 - 2) + s) + 2) / 2
}

export const easeInOutBounce2 = (t: number) => {
  if (t < 0.5) return easeInBounce(t * 2) / 2
  return easeOutBounce(t * 2 - 1) / 2 + 0.5
}

export const steps = (steps: number, t: number) => {
  const step = Math.floor(t * steps)
  return step / steps
}

export const stepsStart = (steps: number, t: number) => {
  const step = Math.floor(t * steps)
  return step / steps
}

export const stepsEnd = (steps: number, t: number) => {
  const step = Math.ceil(t * steps)
  return step / steps
}

export const cubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by

  return (t: number) => {
    const t2 = t * t
    const t3 = t2 * t
    return ax * t3 + bx * t2 + cx * t + cy * t2 + by * t + ay
  }
}

export const linear = (x: number, y: number) => {
  return (t: number) => {
    return x * t + y
  }
}