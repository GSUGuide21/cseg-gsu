// Absolute value function
export const abs = (value: number): number => Math.abs(value)

// GCD and LCM functions
export const gcd = (a: number, b: number): number => {
  if (b === 0) return a
  return gcd(b, a % b)
}

export const lcm = (a: number, b: number): number => {
  if (a === 0 || b === 0) return 0
  return Math.abs(a * b) / gcd(a, b)
}

// Sign function
export const sign = (value: number): number => {
  if (value > 0) return 1
  if (value < 0) return -1
  return 0
}