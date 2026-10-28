import { reciprocal } from './reciprocal'

// Trigonometric functions
export const sin = (angle: number): number => Math.sin(angle)
export const cos = (angle: number): number => Math.cos(angle)
export const tan = (angle: number): number => Math.tan(angle)
export const csc = (angle: number): number => reciprocal(sin(angle))
export const sec = (angle: number): number => reciprocal(cos(angle))
export const cot = (angle: number): number => reciprocal(tan(angle))

// Inverse trigonometric functions
export const asin = (value: number): number => Math.asin(value)
export const acos = (value: number): number => Math.acos(value)
export const atan = (value: number): number => Math.atan(value)
export const acsc = (value: number): number => Math.asin(reciprocal(value))
export const asec = (value: number): number => Math.acos(reciprocal(value))
export const acot = (value: number): number => Math.atan(reciprocal(value))
export const atan2 = (y: number, x: number): number => Math.atan2(y, x)
export const acot2 = (y: number, x: number): number => Math.atan(reciprocal(y / x))

// Hyperbolic functions
export const sinh = (angle: number): number => Math.sinh(angle)
export const cosh = (angle: number): number => Math.cosh(angle)
export const tanh = (angle: number): number => Math.tanh(angle)
export const csch = (angle: number): number => reciprocal(sinh(angle))
export const sech = (angle: number): number => reciprocal(cosh(angle))
export const coth = (angle: number): number => reciprocal(tanh(angle))

// Inverse hyperbolic functions
export const asinh = (value: number): number => Math.asinh(value)
export const acosh = (value: number): number => Math.acosh(value)
export const atanh = (value: number): number => Math.atanh(value)
export const acsch = (value: number): number => Math.asinh(reciprocal(value))
export const asech = (value: number): number => Math.acosh(reciprocal(value))
export const acoth = (value: number): number => Math.atanh(reciprocal(value))
export const atan2h = (y: number, x: number): number => Math.atanh(y / x)
export const acot2h = (y: number, x: number): number => Math.atanh(reciprocal(y / x))
export const acsc2h = (y: number, x: number): number => Math.asinh(reciprocal(y / x))