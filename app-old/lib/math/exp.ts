// Power and root functions
export const pow = (base: number, exponent: number): number => Math.pow(base, exponent)
export const sq = (value: number): number => Math.pow(value, 2)
export const cb = (value: number): number => Math.pow(value, 3)

export const sqrt = (value: number): number => Math.sqrt(value)
export const cbrt = (value: number): number => Math.cbrt(value)
export const nroot = (value: number, n: number): number => Math.pow(value, 1 / n)
export const hypot = (...values: number[]): number => Math.hypot(...values)

export const root = nroot

// Exponential and logarithmic functions
export const exp = (value: number): number => Math.exp(value)
export const ln = (value: number): number => Math.log(value)
export const log = (value: number, base: number): number => Math.log(value) / Math.log(base)
export const log10 = (value: number): number => Math.log10(value)
export const log2 = (value: number): number => Math.log2(value)
export const log1p = (value: number): number => Math.log1p(value)
export const expm1 = (value: number): number => Math.expm1(value)