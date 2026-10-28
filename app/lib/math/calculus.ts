import { abs } from './functions'
import { tan, sec } from './trig'
import { factorial } from './combinatorial'

// Limit functions
export const leftLimit = (fn: (x: number) => number, x: number, h: number = 1e-5): number => {
  return fn(x - h)
}

export const rightLimit = (fn: (x: number) => number, x: number, h: number = 1e-5): number => {
  return fn(x + h)
}

export const baseLimit = (fn: (x: number) => number, x: number, h: number = 1e-5, epsilon: number = 1e-10, maxIterations: number = 100): number => {
  let finalH = h
  let iterations = 0

  while (iterations < maxIterations) {
    const left = leftLimit(fn, x, finalH)
    const right = rightLimit(fn, x, finalH)
    const delta = abs(left - right)

    if (delta < epsilon) return (left + right) / 2

    finalH /= 2
    iterations++
  }

  if (iterations === maxIterations) throw new Error('Limit did not converge.')
  throw new Error('Limit does not exist or is not equal from both sides.')
}

export const limit = (fn: (x: number) => number, x: number, h: number = 1e-5, epsilon: number = 1e-10, maxIterations: number = 100): number => {
  const maxValue = 1e10
  const minValue = -1e10

  if (x === Infinity) return baseLimit(fn, maxValue, h, epsilon, maxIterations)
  if (x === -Infinity) return baseLimit(fn, minValue, h, epsilon, maxIterations)
  if (isNaN(x)) throw new Error('Limit is not defined for NaN')
  return baseLimit(fn, x, h, epsilon, maxIterations)
}

// Derivative functions
export const derivative = (fn: (x: number) => number, x: number, h: number = 1e-5, epsilon: number = 1e-10, maxIterations: number = 100): number => {
  if (isNaN(x)) throw new Error('Derivative is not defined for NaN')
  if (h <= 0) throw new Error('Step size must be positive')
  if (h === 0) return fn(x)
  const difference = (t: number): number => (fn(t + h) - fn(t - h)) / (2 * h)

  const limitValue = limit(difference, x, h, epsilon, maxIterations)
  if (limitValue === Infinity || limitValue === -Infinity) throw new Error('Derivative does not exist or is infinite.')
  if (isNaN(limitValue)) throw new Error('Derivative is not defined for NaN')
  return limitValue
}

export const secondDerivative = (fn: (x: number) => number, x: number, h: number = 1e-5, epsilon: number = 1e-10, maxIterations: number = 100): number => {
  if (isNaN(x)) throw new Error('Second derivative is not defined for NaN')
  if (h <= 0) throw new Error('Step size must be positive')
  if (h === 0) return fn(x)
  const difference = (t: number): number => (fn(t + h) - 2 * fn(t) + fn(t - h)) / (h ** 2)

  const limitValue = limit(difference, x, h, epsilon, maxIterations)
  if (limitValue === Infinity || limitValue === -Infinity) throw new Error('Second derivative does not exist or is infinite.')
  if (isNaN(limitValue)) throw new Error('Second derivative is not defined for NaN')
  return limitValue
}

export const nthDerivative = (fn: (x: number) => number, x: number, n: number, h: number = 1e-5, epsilon: number = 1e-10, maxIterations: number = 100): number => {
  if (n < 0) throw new Error('Derivative order must be non-negative')
  if (n === 0) return fn(x)
  if (n === 1) return derivative(fn, x, h, epsilon, maxIterations)
  if (n === 2) return secondDerivative(fn, x, h, epsilon, maxIterations)
  return (nthDerivative(fn, x + h, n - 1, h, epsilon, maxIterations) - nthDerivative(fn, x - h, n - 1, h, epsilon, maxIterations)) / (2 * h)
}

// Numerical integration functions
export const trapezoidalRule = (fn: (x: number) => number, a: number, b: number, n: number = 1000): number => {
  if (a >= b) throw new Error('Invalid integration limits')
  const h = (b - a) / n
  let sum = 0.5 * (fn(a) + fn(b))
  for (let i = 1; i < n; i++) {
    sum += fn(a + i * h)
  }
  return sum * h
}

export const simpsonRule = (fn: (x: number) => number, a: number, b: number, n: number = 1000): number => {
  if (a >= b) throw new Error('Invalid integration limits')
  if (n % 2 !== 0) throw new Error('n must be even for Simpson\'s rule')
  const h = (b - a) / n
  let sum = fn(a) + fn(b)
  for (let i = 1; i < n; i++) {
    if (i % 2 === 0) {
      sum += 2 * fn(a + i * h)
    } else {
      sum += 4 * fn(a + i * h)
    }
  }
  return (h / 3) * sum
}

export const midpointRule = (fn: (x: number) => number, a: number, b: number, n: number = 1000): number => {
  if (a >= b) throw new Error('Invalid integration limits')
  const h = (b - a) / n
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += fn(a + (i + 0.5) * h)
  }
  return sum * h
}

export const leftRiemannSum = (fn: (x: number) => number, a: number, b: number, n: number = 1000): number => {
  if (a >= b) throw new Error('Invalid integration limits')
  const h = (b - a) / n
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += fn(a + i * h)
  }
  return sum * h
}

export const rightRiemannSum = (fn: (x: number) => number, a: number, b: number, n: number = 1000): number => {
  if (a >= b) throw new Error('Invalid integration limits')
  const h = (b - a) / n
  let sum = 0
  for (let i = 1; i <= n; i++) {
    sum += fn(a + i * h)
  }
  return sum * h
}

// Methods of integration
export type IntegrationMethod = 'trapezoidal' | 'simpson' | 'midpoint' | 'leftRiemann' | 'rightRiemann'

// Integral functions
export const integral = (fn: (x: number) => number, a: number, b: number, n: number = 1000, epsilon: number = 1e10, maxIterations: number = 100, method: IntegrationMethod = 'midpoint'): number => {
  if (!isFinite(a) || !isFinite(b)) {
    const transformedFn = (t: number): number => {
      // Transform the function to handle -infinity to +infinity
      if (a === -Infinity || b === Infinity) return (fn(tan(t)) * (sec(t) ** 2))
      // Transform the function to handle -infinity to b
      if (a === -Infinity) return (fn(b - (1 / t)) * (1 / (t ** 2)))
      // Transform the function to handle a to infinity
      if (b === Infinity) return (fn(a + (1 / t)) * (1 / (t ** 2)))
      // Throw an error if both limits are finite
      throw new Error('Invalid infinite integration limits')
    }

    const transformedA = a === -Infinity ? -Math.PI / 2 : a
    const transformedB = b === Infinity ? Math.PI / 2 : b

    return integral(transformedFn, transformedA, transformedB, n)
  }

  const midpoint = (c: number) => midpointRule(fn, a, b, c)
  const trapezoidal = (c: number) => trapezoidalRule(fn, a, b, c)
  const simpson = (c: number) => simpsonRule(fn, a, b, c)
  const leftRiemann = (c: number) => leftRiemannSum(fn, a, b, c)
  const rightRiemann = (c: number) => rightRiemannSum(fn, a, b, c)

  const methods = { midpoint, trapezoidal, simpson, leftRiemann, rightRiemann }
  const selectedMethod = methods[method]
  if (!selectedMethod) throw new Error('Invalid integration method')

  if (a === b) return 0
  if (a > b) return -integral(fn, b, a, n, epsilon, maxIterations, method)
  if (n <= 0) throw new Error('Number of intervals must be positive')

  return limit(selectedMethod, Infinity, n, epsilon, maxIterations)
}

export const definiteIntegral = (fn: (x: number) => number, a: number, b: number): number => {
  return integral(fn, a, b)
}

/* export const indefiniteIntegral = (fn: (x: number) => number, x: number): number => {
  // This is a placeholder for indefinite integrals
  // In practice, you would need to use symbolic integration libraries for this
  throw new Error('Indefinite integral is not implemented')
} */

export const integralByParts = (u: (x: number) => number, dv: (x: number) => number, a: number, b: number): number => {
  const v = (x: number) => integral(dv, a, x)
  return u(b) * v(b) - u(a) * v(a) - integral((x: number) => v(x) * derivative(u, x), a, b)
}

export const integralSubstitution = (fn: (x: number) => number, u: (x: number) => number, du: (x: number) => number, a: number, b: number): number => {
  const newA = u(a)
  const newB = u(b)
  return integral((x: number) => fn(u(x)) * du(x), newA, newB)
}

// Summation functions
export const summation = (fn: (n: number) => number, n: number): number => {
  let sum = 0
  for (let i = 1; i <= n; i++) {
    sum += fn(i)
  }
  return sum
}

// Taylor series expansion
export const taylorSeries = (fn: (x: number) => number, x: number, n: number): number => {
  let sum = 0
  for (let i = 0; i <= n; i++) {
    sum += (nthDerivative(fn, 0, i) / factorial(i)) * Math.pow(x, i)
  }
  return sum
}
