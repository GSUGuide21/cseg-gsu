import { min, max } from './random'
import { Matrix } from './matrix'

// Statistical functions
export const mean = (values: number[]): number => {
  if (values.length === 0) throw new Error('Cannot calculate mean of an empty array')
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export const geometricMean = (values: number[]): number => {
  if (values.length === 0) throw new Error('Cannot calculate geometric mean of an empty array')
  if (values.some(value => value < 0)) throw new Error('Geometric mean is not defined for negative numbers')
  return Math.pow(values.reduce((product, value) => product * value, 1), 1 / values.length)
}

export const harmonicMean = (values: number[]): number => {
  if (values.length === 0) throw new Error('Cannot calculate harmonic mean of an empty array')
  if (values.some(value => value <= 0)) throw new Error('Harmonic mean is not defined for non-positive numbers')
  return values.length / values.reduce((sum, value) => sum + 1 / value, 0)
}

export const weightedMean = (values: number[], weights: number[]): number => {
  if (values.length === 0) throw new Error('Cannot calculate weighted mean of an empty array')
  if (values.length !== weights.length) throw new Error('Values and weights must have the same length')
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  return values.reduce((sum, value, index) => sum + value * (weights[index] / totalWeight), 0)
}

export const average = mean // Alias for mean

export const median = (values: number[]): number => {
  if (values.length === 0) throw new Error('Cannot calculate median of an empty array')
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2

  return sorted[mid]
}

export const mode = (values: number[]): number[] => {
  if (values.length === 0) throw new Error('Cannot calculate mode of an empty array')
  const frequency: Record<number, number> = {}
  let maxFreq = 0
  const modes: number[] = []

  for (const value of values) {
    frequency[value] = (frequency[value] || 0) + 1
    if (frequency[value] > maxFreq) maxFreq = frequency[value]
  }

  for (const value in frequency) {
    if (frequency[value] === maxFreq) modes.push(Number(value))
  }

  return modes
}

export const variance = (values: number[]): number => {
  if (values.length === 0) throw new Error('Cannot calculate variance of an empty array')
  const meanValue = mean(values)
  return values.reduce((sum, value) => sum + Math.pow(value - meanValue, 2), 0) / values.length
}

export const standardDeviation = (values: number[]): number => {
  if (values.length === 0) throw new Error('Cannot calculate standard deviation of an empty array')
  return Math.sqrt(variance(values))
}

export const covariance = (x: number[], y: number[]): number => {
  if (x.length !== y.length) throw new Error('Arrays must have the same length')
  if (x.length === 0) throw new Error('Cannot calculate covariance of empty arrays')
  const meanX = mean(x)
  const meanY = mean(y)
  return x.reduce((sum, value, index) => sum + (value - meanX) * (y[index] - meanY), 0) / x.length
}

export const correlation = (x: number[], y: number[]): number => {
  if (x.length !== y.length) throw new Error('Arrays must have the same length')
  if (x.length === 0) throw new Error('Cannot calculate correlation of empty arrays')
  const cov = covariance(x, y)
  const stdX = standardDeviation(x)
  const stdY = standardDeviation(y)
  return cov / (stdX * stdY)
}

export const covarianceMatrix = (values: number[][]): Matrix => {
  if (values.length === 0) throw new Error('Cannot calculate covariance matrix of an empty array')
  const n = values[0].length
  const m = values.length
  const meanValues = values.map(row => mean(row))
  const covMatrix = Array.from({ length: n }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      covMatrix[i][j] = values.reduce((sum, row) => sum + (row[i] - meanValues[i]) * (row[j] - meanValues[j]), 0) / m
    }
  }
  return new Matrix(covMatrix)
}

export const correlationMatrix = (values: number[][]): Matrix => {
  if (values.length === 0) throw new Error('Cannot calculate correlation matrix of an empty array')
  const covMatrix = covarianceMatrix(values)
  const stdDevs = values.map(row => standardDeviation(row))
  const corrMatrix = Array.from({ length: values[0].length }, () => Array(values[0].length).fill(0))
  for (let i = 0; i < values[0].length; i++) {
    for (let j = 0; j < values[0].length; j++) {
      corrMatrix[i][j] = covMatrix.get(i, j) / (stdDevs[i] * stdDevs[j])
    }
  }
  return new Matrix(corrMatrix)
}

export const zScore = (value: number, meanValue: number, stdDev: number): number => {
  if (stdDev === 0) throw new Error('Standard deviation cannot be zero')
  return (value - meanValue) / stdDev
}

export const sampleMean = (values: number[]): number => {
  if (values.length === 0) throw new Error('Cannot calculate sample mean of an empty array')
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export const sampleVariance = (values: number[]): number => {
  if (values.length === 0) throw new Error('Cannot calculate sample variance of an empty array')
  const meanValue = mean(values)
  return values.reduce((sum, value) => sum + Math.pow(value - meanValue, 2), 0) / (values.length - 1)
}

export const sampleStandardDeviation = (values: number[]): number => {
  if (values.length === 0) throw new Error('Cannot calculate sample standard deviation of an empty array')
  return Math.sqrt(sampleVariance(values))
}

export const sampleCovariance = (x: number[], y: number[]): number => {
  if (x.length !== y.length) throw new Error('Arrays must have the same length')
  if (x.length === 0) throw new Error('Cannot calculate sample covariance of empty arrays')
  const meanX = sampleMean(x)
  const meanY = sampleMean(y)
  return x.reduce((sum, value, index) => sum + (value - meanX) * (y[index] - meanY), 0) / (x.length - 1)
}

export const sampleCorrelation = (x: number[], y: number[]): number => {
  if (x.length !== y.length) throw new Error('Arrays must have the same length')
  if (x.length === 0) throw new Error('Cannot calculate sample correlation of empty arrays')
  const cov = sampleCovariance(x, y)
  const stdX = sampleStandardDeviation(x)
  const stdY = sampleStandardDeviation(y)
  return cov / (stdX * stdY)
}

export const percentile = (values: number[], p: number): number => {
  if (values.length === 0) throw new Error('Cannot calculate percentile of an empty array')
  if (p < 0 || p > 100) throw new Error('Percentile must be between 0 and 100')
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.floor((p / 100) * (sorted.length - 1))
  return sorted[index]
}

export const quartiles = (values: number[]): number[] => {
  if (values.length === 0) throw new Error('Cannot calculate quartiles of an empty array')
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = percentile(sorted, 25)
  const q2 = median(sorted)
  const q3 = percentile(sorted, 75)
  return [q1, q2, q3]
}

export const iqr = (values: number[]): number => {
  if (values.length === 0) throw new Error('Cannot calculate IQR of an empty array')
  const [q1, q3] = quartiles(values)
  return q3 - q1
}

export const interquartileRange = iqr // Alias for IQR

export const range = (values: number[]): number => {
  if (values.length === 0) throw new Error('Cannot calculate range of an empty array')
  return max(...values) - min(...values)
}

export const sum = (values: number[]): number => {
  if (values.length === 0) throw new Error('Cannot calculate sum of an empty array')
  return values.reduce((acc, value) => acc + value, 0)
}

export const product = (values: number[]): number => {
  if (values.length === 0) throw new Error('Cannot calculate product of an empty array')
  return values.reduce((acc, value) => acc * value, 1)
}

export const cumulativeSum = (values: number[]): number[] => {
  if (values.length === 0) throw new Error('Cannot calculate cumulative sum of an empty array')
  return values.reduce((acc, value) => {
    acc.push((acc[acc.length - 1] || 0) + value)
    return acc
  }, [] as number[])
}

export const cumulativeProduct = (values: number[]): number[] => {
  if (values.length === 0) throw new Error('Cannot calculate cumulative product of an empty array')
  return values.reduce((acc, value) => {
    acc.push((acc[acc.length - 1] || 1) * value)
    return acc
  }, [] as number[])
}

export const cumulativeMin = (values: number[]): number[] => {
  if (values.length === 0) throw new Error('Cannot calculate cumulative min of an empty array')
  return values.reduce((acc, value) => {
    acc.push(Math.min(acc[acc.length - 1] || Infinity, value))
    return acc
  }, [] as number[])
}

export const cumulativeMax = (values: number[]): number[] => {
  if (values.length === 0) throw new Error('Cannot calculate cumulative max of an empty array')
  return values.reduce((acc, value) => {
    acc.push(Math.max(acc[acc.length - 1] || -Infinity, value))
    return acc
  }, [] as number[])
}

export const cumulativeAverage = (values: number[]): number[] => {
  if (values.length === 0) throw new Error('Cannot calculate cumulative average of an empty array')
  return values.reduce((acc, value) => {
    acc.push((acc[acc.length - 1] || 0) + (value - (acc[acc.length - 1] || 0)) / (acc.length + 1))
    return acc
  }, [] as number[])
}

export const cumulativeMean = cumulativeAverage // Alias for cumulative average

export const cumulativeMedian = (values: number[]): number[] => {
  if (values.length === 0) throw new Error('Cannot calculate cumulative median of an empty array')
  return values.reduce((acc, value) => {
    const sorted = [...acc, value].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    acc.push(sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid])
    return acc
  }, [] as number[])
}

export const cumulativeVariance = (values: number[]): number[] => {
  if (values.length === 0) throw new Error('Cannot calculate cumulative variance of an empty array')
  return values.reduce((acc, value) => {
    const n = acc.length
    const meanValue = (acc[n - 1] || 0) + (value - (acc[n - 1] || 0)) / (n + 1)
    acc.push((acc[n - 1] || 0) + (value - meanValue) * (value - (acc[n - 1] || 0)) / n)
    return acc
  }, [] as number[])
}

export const cumulativeZScore = (value: number, meanValue: number, stdDev: number): number => {
  if (stdDev === 0) throw new Error('Standard deviation cannot be zero')
  return (value - meanValue) / stdDev
}

export const cumulativeStandardDeviation = (values: number[]): number[] => {
  if (values.length === 0) throw new Error('Cannot calculate cumulative standard deviation of an empty array')
  return cumulativeVariance(values).map(varianceValue => Math.sqrt(varianceValue))
}

export const cumulativeCovariance = (x: number[], y: number[]): number[] => {
  if (x.length !== y.length) throw new Error('Arrays must have the same length')
  if (x.length === 0) throw new Error('Cannot calculate cumulative covariance of empty arrays')
  return x.reduce((acc, value, index) => {
    const n = acc.length
    const meanX = (acc[n - 1] || 0) + (value - (acc[n - 1] || 0)) / (n + 1)
    const meanY = (acc[n - 1] || 0) + (y[index] - (acc[n - 1] || 0)) / (n + 1)
    acc.push((acc[n - 1] || 0) + (value - meanX) * (y[index] - meanY) / n)
    return acc
  }, [] as number[])
}

export const cumulativeCorrelation = (x: number[], y: number[]): number[] => {
  if (x.length !== y.length) throw new Error('Arrays must have the same length')
  if (x.length === 0) throw new Error('Cannot calculate cumulative correlation of empty arrays')
  const cov = cumulativeCovariance(x, y)
  const stdX = cumulativeStandardDeviation(x)
  const stdY = cumulativeStandardDeviation(y)
  return cov.map((covValue, index) => covValue / (stdX[index] * stdY[index]))
}

// Random number generation
export const randomNormal = (mean: number, stdDev: number): number => {
  if (stdDev <= 0) throw new Error('Standard deviation must be positive')
  return mean + stdDev * Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random())
}

export const randomExponential = (lambda: number): number => {
  if (lambda <= 0) throw new Error('Lambda must be positive')
  return -Math.log(Math.random()) / lambda
}

export const randomUniform = (min: number, max: number): number => {
  return Math.random() * (max - min) + min
}

export const randomBinomial = (n: number, p: number): number => {
  if (n < 0 || p < 0 || p > 1) throw new Error('Invalid parameters for binomial distribution')
  let count = 0
  for (let i = 0; i < n; i++) {
    if (Math.random() < p) count++
  }
  return count
}

export const randomPoisson = (lambda: number): number => {
  if (lambda <= 0) throw new Error('Lambda must be positive')
  let count = 0
  const product = Math.exp(-lambda)
  let randomValue = Math.random()
  while (randomValue > product) {
    count++
    randomValue *= Math.random()
  }
  return count
}

export const randomGeometric = (p: number): number => {
  if (p <= 0 || p > 1) throw new Error('Invalid parameter for geometric distribution')
  return Math.floor(Math.log(Math.random()) / Math.log(1 - p))
}

export const randomNegativeBinomial = (n: number, p: number): number => {
  if (n < 0 || p <= 0 || p > 1) throw new Error('Invalid parameters for negative binomial distribution')
  let count = 0
  let successes = 0
  while (successes < n) {
    if (Math.random() < p) {
      successes++
    } else {
      count++
    }
  }
  return count
}

export const randomBernoulli = (p: number): number => {
  if (p < 0 || p > 1) throw new Error('Invalid parameter for Bernoulli distribution')
  return Math.random() < p ? 1 : 0
}

export const randomTriangular = (min: number, max: number, mode: number): number => {
  if (min >= max) throw new Error('Invalid parameters for triangular distribution')
  if (mode < min || mode > max) throw new Error('Mode must be between min and max')
  const u = Math.random()
  if (u < (mode - min) / (max - min)) {
    return min + Math.sqrt(u * (max - min) * (mode - min))
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode))
  }
}

export const randomLogNormal = (mean: number, stdDev: number): number => {
  if (stdDev <= 0) throw new Error('Standard deviation must be positive')
  return Math.exp(randomNormal(mean, stdDev))
}

export const randomGamma = (k: number, theta: number): number => {
  if (k <= 0 || theta <= 0) throw new Error('Invalid parameters for gamma distribution')
  let product = 1
  for (let i = 0; i < k; i++) {
    product *= Math.random()
  }
  return -theta * Math.log(product)
}

export const randomBeta = (alpha: number, beta: number): number => {
  if (alpha <= 0 || beta <= 0) throw new Error('Invalid parameters for beta distribution')
  const x = randomGamma(alpha, 1)
  const y = randomGamma(beta, 1)
  return x / (x + y)
}

export const randomWeibull = (lambda: number, k: number): number => {
  if (lambda <= 0 || k <= 0) throw new Error('Invalid parameters for Weibull distribution')
  return lambda * Math.pow(-Math.log(Math.random()), 1 / k)
}

export const randomCauchy = (x0: number, gamma: number): number => {
  if (gamma <= 0) throw new Error('Gamma must be positive')
  return x0 + gamma * Math.tan(Math.PI * (Math.random() - 0.5))
}

export const randomRayleigh = (sigma: number): number => {
  if (sigma <= 0) throw new Error('Sigma must be positive')
  return sigma * Math.sqrt(-2 * Math.log(Math.random()))
}

// Random sampling
export const randomSample = (array: number[], size: number): number[] => {
  if (size > array.length) throw new Error('Sample size cannot be larger than the array length')
  const shuffled = [...array].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, size)
}

export const randomSampleWithReplacement = (array: number[], size: number): number[] => {
  if (size <= 0) throw new Error('Sample size must be positive')
  return Array.from({ length: size }, () => array[Math.floor(Math.random() * array.length)])
}

export const randomShuffle = (array: number[]): number[] => {
  return array.sort(() => Math.random() - 0.5)
}

export const randomWeightedSample = (array: number[], weights: number[], size: number): number[] => {
  if (array.length !== weights.length) throw new Error('Array and weights must have the same length')
  if (size > array.length) throw new Error('Sample size cannot be larger than the array length')
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const normalizedWeights = weights.map(weight => weight / totalWeight)
  const cumulativeWeights = normalizedWeights.reduce((acc, weight) => {
    acc.push((acc[acc.length - 1] || 0) + weight)
    return acc
  }, [] as number[])
  return Array.from({ length: size }, () => {
    const randomValue = Math.random()
    return array[cumulativeWeights.findIndex(weight => weight >= randomValue)]
  })
}

// Random number generation with seed
export const randomSeed = (seed: number): number => {
  // Simple linear congruential generator (LCG)
  const a = 1664525
  const c = 1013904223
  const m = Math.pow(2, 32)
  seed = (a * seed + c) % m
  return seed / m
}

export const randomSeedNormal = (seed: number, mean: number, stdDev: number): number => {
  if (stdDev <= 0) throw new Error('Standard deviation must be positive')
  return mean + stdDev * Math.sqrt(-2 * Math.log(randomSeed(seed))) * Math.cos(2 * Math.PI * randomSeed(seed))
}

export const randomSeedExponential = (seed: number, lambda: number): number => {
  if (lambda <= 0) throw new Error('Lambda must be positive')
  return -Math.log(randomSeed(seed)) / lambda
}

export const randomSeedUniform = (seed: number, min: number, max: number): number => {
  return randomSeed(seed) * (max - min) + min
}

export const randomSeedBinomial = (seed: number, n: number, p: number): number => {
  if (n < 0 || p < 0 || p > 1) throw new Error('Invalid parameters for binomial distribution')
  let count = 0
  for (let i = 0; i < n; i++) {
    if (randomSeed(seed) < p) count++
  }
  return count
}

export const randomSeedPoisson = (seed: number, lambda: number): number => {
  if (lambda <= 0) throw new Error('Lambda must be positive')
  let count = 0
  const product = Math.exp(-lambda)
  let randomValue = randomSeed(seed)
  while (randomValue > product) {
    count++
    randomValue *= randomSeed(seed)
  }
  return count
}

export const randomSeedGeometric = (seed: number, p: number): number => {
  if (p <= 0 || p > 1) throw new Error('Invalid parameter for geometric distribution')
  return Math.floor(Math.log(randomSeed(seed)) / Math.log(1 - p))
}

export const randomSeedNegativeBinomial = (seed: number, n: number, p: number): number => {
  if (n < 0 || p <= 0 || p > 1) throw new Error('Invalid parameters for negative binomial distribution')
  let count = 0
  let successes = 0
  while (successes < n) {
    if (randomSeed(seed) < p) {
      successes++
    } else {
      count++
    }
  }
  return count
}

export const randomSeedBernoulli = (seed: number, p: number): number => {
  if (p < 0 || p > 1) throw new Error('Invalid parameter for Bernoulli distribution')
  return randomSeed(seed) < p ? 1 : 0
}

export const randomSeedTriangular = (seed: number, min: number, max: number, mode: number): number => {
  if (min >= max) throw new Error('Invalid parameters for triangular distribution')
  if (mode < min || mode > max) throw new Error('Mode must be between min and max')
  const u = randomSeed(seed)
  if (u < (mode - min) / (max - min)) {
    return min + Math.sqrt(u * (max - min) * (mode - min))
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode))
  }
}

export const randomSeedLogNormal = (seed: number, mean: number, stdDev: number): number => {
  if (stdDev <= 0) throw new Error('Standard deviation must be positive')
  return Math.exp(randomSeedNormal(seed, mean, stdDev))
}

export const randomSeedGamma = (seed: number, k: number, theta: number): number => {
  if (k <= 0 || theta <= 0) throw new Error('Invalid parameters for gamma distribution') 
  let product = 1
  for (let i = 0; i < k; i++) {
    product *= randomSeed(seed)
  }
  return -theta * Math.log(product)
}

export const randomSeedBeta = (seed: number, alpha: number, beta: number): number => {
  if (alpha <= 0 || beta <= 0) throw new Error('Invalid parameters for beta distribution')
  const x = randomSeedGamma(seed, alpha, 1)
  const y = randomSeedGamma(seed, beta, 1)
  return x / (x + y)
}

export const randomSeedWeibull = (seed: number, lambda: number, k: number): number => {
  if (lambda <= 0 || k <= 0) throw new Error('Invalid parameters for Weibull distribution')
  return lambda * Math.pow(-Math.log(randomSeed(seed)), 1 / k)
}

export const randomSeedCauchy = (seed: number, x0: number, gamma: number): number => {
  if (gamma <= 0) throw new Error('Gamma must be positive')
  return x0 + gamma * Math.tan(Math.PI * (randomSeed(seed) - 0.5))
}

export const randomSeedRayleigh = (seed: number, sigma: number): number => {
  if (sigma <= 0) throw new Error('Sigma must be positive')
  return sigma * Math.sqrt(-2 * Math.log(randomSeed(seed)))
}