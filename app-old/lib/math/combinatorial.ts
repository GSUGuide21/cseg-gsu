import { exp } from './exp'
import { integral } from './calculus'

const factorialCache: Record<number, number> = {}
const fibonacciCache: Record<number, number> = {}

// Factorial function
export const factorial = (n: number): number => {
  if (n < 0) throw new Error('Factorial is not defined for negative numbers')
  if (n === 0 || n === 1) return 1
  if (factorialCache[n]) return factorialCache[n]

  factorialCache[n] = n * factorial(n - 1)
  return factorialCache[n]
}

// Combinatorial functions
export const permutation = (n: number, r: number): number => {
  if (n < r) throw new Error('Permutation is not defined for n < r')
  if (r === 0) return 1
  if (n === r) return factorial(n)
  return factorial(n) / factorial(n - r)
}

export const nPr = permutation // Alias for permutation

export const combination = (n: number, r: number): number => {
  if (n < r) throw new Error('Combination is not defined for n < r')
  if (r === 0) return 1
  if (n === r) return 1
  return factorial(n) / (factorial(r) * factorial(n - r))
}

export const nCr = combination // Alias for combination
export const choose = combination // Alias for combination

// Fibonacci function
export const fibonacci = (n: number): number => {
  if (n < 0) throw new Error('Fibonacci is not defined for negative numbers')
  if (n === 0) return 0
  if (n === 1) return 1
  if (fibonacciCache[n]) return fibonacciCache[n]

  fibonacciCache[n] = fibonacci(n - 1) + fibonacci(n - 2)
  return fibonacciCache[n]
}

// Binomial coefficient function
export const binomialCoefficient = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  return combination(n, k)
}

// Gamma function
export const gamma = (n: number): number => {
  if (n <= 0) throw new Error('Gamma function is not defined for non-positive numbers')
  if (n === 1 || n === 2) return 1
  return (n - 1) * gamma(n - 1)
}

// Gamma function using integral
export const gammaIntegral = (n: number): number => {
  if (n <= 0) throw new Error('Gamma function is not defined for non-positive numbers')
  if (n === 1) return 1
  return integral((x: number) => exp(-x) * Math.pow(x, n - 1), 0, Infinity)
}

// Factorial function using gamma
export const factorialGamma = (n: number): number => {
  if (n < 0) throw new Error('Factorial is not defined for negative numbers')
  if (n === 0) return 1
  return gamma(n + 1)
}

// Beta function
export const beta = (x: number, y: number): number => {
  if (x <= 0 || y <= 0) throw new Error('Beta function is not defined for non-positive numbers')
  return gamma(x) * gamma(y) / gamma(x + y)
}

// Bell number function
export const bellNumber = (n: number): number => {
  if (n < 0) throw new Error('Bell number is not defined for negative numbers')
  if (n === 0) return 1
  if (n === 1) return 1

  const bell = Array(n + 1).fill(0).map(() => Array(n + 1).fill(0))
  bell[0][0] = 1

  for (let i = 1; i <= n; i++) {
    for (let j = 0; j <= i; j++) {
      if (j === 0) {
        bell[i][j] = bell[i - 1][i - 1]
      } else {
        bell[i][j] = bell[i - 1][j - 1] + bell[i][j - 1]
      }
    }
  }

  return bell[n][0]
}

// Stirling number of the second kind function
export const stirlingSecondKind = (n: number, k: number): number => {
  if (n < 0 || k < 0) throw new Error('Stirling number is not defined for negative numbers')
  if (k === 0) return n === 0 ? 1 : 0
  if (n === k) return 1
  if (n < k) return 0

  const stirling = Array(n + 1).fill(0).map(() => Array(k + 1).fill(0))
  stirling[0][0] = 1

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= k; j++) {
      stirling[i][j] = j * stirling[i - 1][j] + stirling[i - 1][j - 1]
    }
  }

  return stirling[n][k]
}

// Stirling number of the first kind function
export const stirlingFirstKind = (n: number, k: number): number => {
  if (n < 0 || k < 0) throw new Error('Stirling number is not defined for negative numbers')
  if (k === 0) return n === 0 ? 1 : 0
  if (n === k) return factorial(n)
  if (n < k) return 0

  const stirling = Array(n + 1).fill(0).map(() => Array(k + 1).fill(0))
  stirling[0][0] = 1

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= k; j++) {
      stirling[i][j] = stirling[i - 1][j - 1] + (i - 1) * stirling[i - 1][j]
    }
  }

  return stirling[n][k]
}

// Catalan number function
export const catalanNumber = (n: number): number => {
  if (n < 0) throw new Error('Catalan number is not defined for negative numbers')
  return combination(2 * n, n) / (n + 1)
}

// Bell polynomial function
export const bellPolynomial = (n: number, k: number): number => {
  if (n < 0 || k < 0) throw new Error('Bell polynomial is not defined for negative numbers')
  if (k === 0) return n === 0 ? 1 : 0
  if (n === k) return factorial(n)

  const bell = Array(n + 1).fill(0).map(() => Array(k + 1).fill(0))
  bell[0][0] = 1

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= k; j++) {
      bell[i][j] = bell[i - 1][j - 1] + (i - 1) * bell[i - 1][j]
    }
  }

  return bell[n][k]
}

// Multinomial coefficient function
export const multinomialCoefficient = (n: number, k: number[]): number => {
  if (n < 0) throw new Error('Multinomial coefficient is not defined for negative numbers')
  if (k.reduce((a, b) => a + b, 0) !== n) throw new Error('Sum of k must be equal to n')

  return factorial(n) / k.reduce((a, b) => a * factorial(b), 1)
}

// Partition function
export const partition = (n: number): number => {
  if (n < 0) throw new Error('Partition function is not defined for negative numbers')
  if (n === 0) return 1

  const partition = Array(n + 1).fill(0)
  partition[0] = 1

  for (let i = 1; i <= n; i++) {
    for (let j = i; j <= n; j++) {
      partition[j] += partition[j - i]
    }
  }

  return partition[n]
}

// Pascal's triangle function
export const pascalTriangle = (n: number): number[][] => {
  if (n < 0) throw new Error('Pascal\'s triangle is not defined for negative numbers')
  const triangle: number[][] = []

  for (let i = 0; i <= n; i++) {
    triangle[i] = []
    for (let j = 0; j <= i; j++) {
      if (j === 0 || j === i) {
        triangle[i][j] = 1
      } else {
        triangle[i][j] = triangle[i - 1][j - 1] + triangle[i - 1][j]
      }
    }
  }

  return triangle
}