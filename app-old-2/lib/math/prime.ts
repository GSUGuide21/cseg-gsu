// Prime number functions
export const isPrime = (n: number): boolean => {
  if (n <= 1) return false
  if (n <= 3) return true
  if (n % 2 === 0 || n % 3 === 0) return false

  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false
  }

  return true
}

export const nextPrime = (n: number): number => {
  if (n <= 1) return 2
  let prime = n
  let found = false

  while (!found) {
    prime++
    if (isPrime(prime)) found = true
  }

  return prime
}

export const previousPrime = (n: number): number => {
  if (n <= 2) return -1
  let prime = n
  let found = false

  while (!found) {
    prime--
    if (isPrime(prime)) found = true
  }

  return prime
}