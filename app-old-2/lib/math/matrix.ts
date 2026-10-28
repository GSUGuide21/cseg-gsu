import { Vector } from './vector'

// Matrices
export class Matrix {
  public data: Vector[]

  static identity(size: number): Matrix {
    const identityMatrix = new Matrix(Array.from({ length: size }, (_, rowIndex) => {
      return Array.from({ length: size }, (_, colIndex) => (rowIndex === colIndex ? 1 : 0))
    }))
    return identityMatrix
  }

  static zero(rows: number, cols: number): Matrix {
    const zeroMatrix = new Matrix(Array.from({ length: rows }, () => Array(cols).fill(0)))
    return zeroMatrix
  }

  static fromArray(array: number[][]): Matrix {
    return new Matrix(array)
  }

  static fromVectors(vectors: Vector[]): Matrix {
    return new Matrix(vectors)
  }

  static fromVector(vector: Vector): Matrix {
    return new Matrix([vector]) // Treating a vector as a single row matrix
  }

  static Identity2 = Matrix.identity(2)
  static Identity3 = Matrix.identity(3)
  static Identity4 = Matrix.identity(4)

  static Zero2 = Matrix.zero(2, 2)
  static Zero3 = Matrix.zero(3, 3)
  static Zero4 = Matrix.zero(4, 4)

  constructor(data: number[][] | Vector[] = []) {
    this.data = data.map(row => row instanceof Vector ? row : new Vector(row))
    this.setRows()
  }

  get rows(): number {
    return this.data.length
  }

  get cols(): number {
    return this.data[0] ? this.data[0].size : 0
  }

  get size(): number {
    return this.rows * this.cols
  }

  get isSquare(): boolean {
    return this.rows === this.cols
  }

  get(row: number, col: number): number {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) throw new Error('Index out of bounds.')
    return this.data[row].get(col)
  }

  set(row: number, col: number, value: number): void {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) throw new Error('Index out of bounds.')
    this.data[row].set(col, value)
  }

  setRows(): void {
    this.data.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        this.set(rowIndex, colIndex, value)
      })
    })
  }

  forEach(callback: (value: number, row: number, col: number) => void): void {
    this.data.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        callback(value, rowIndex, colIndex)
      })
    })
  }

  tap(callback: (value: number, row: number, col: number) => void): this {
    this.forEach(callback)
    return this
  }

  map(callback: (value: number, row: number, col: number) => number): Matrix {
    return new Matrix(this.data.map((row, rowIndex) => {
      return row.map((value, colIndex) => callback(value, rowIndex, colIndex))
    }))
  }

  transpose(): Matrix {
    if (this.rows === 0 || this.cols === 0) throw new Error('Cannot transpose an empty matrix.')
    // Using Array.from to create a new array
    return new Matrix(Array.from({ length: this.cols }, (_, colIndex) => {
      return this.data.map(row => row.get(colIndex))
    }))
  }

  add(other: Matrix): Matrix {
    if (this.rows !== other.rows || this.cols !== other.cols) throw new Error('Matrices must have the same dimensions.')
    return new Matrix(this.data.map((row, rowIndex) => {
      return row.map((value, colIndex) => value + other.get(rowIndex, colIndex))
    }))
  }

  subtract(other: Matrix): Matrix {
    if (this.rows !== other.rows || this.cols !== other.cols) throw new Error('Matrices must have the same dimensions.')
    return new Matrix(this.data.map((row, rowIndex) => {
      return row.map((value, colIndex) => value - other.get(rowIndex, colIndex))
    }))
  }

  dot(other: Matrix): number {
    if (this.cols !== other.rows) throw new Error('These matrices cannot be multiplied: The number of columns for matrix A must match the number of rows for matrix B.')
    return this.data.reduce((sum, row, rowIndex) => {
      return sum + row.components.reduce((rowSum, value, colIndex) => rowSum + value * other.get(rowIndex, colIndex), 0)
    }, 0)
  }

  multiply(other: Matrix): Matrix {
    if (this.cols !== other.rows) throw new Error('These matrices cannot be multiplied: The number of columns for matrix A must match the number of rows for matrix B.')
    return new Matrix(this.data.map(row => {
      return other.data[0].map((_, colIndex) => {
        return row.components.reduce((sum, value, index) => sum + value * other.get(index, colIndex), 0)
      })
    }))
  }

  scale(scalar: number): Matrix {
    return new Matrix(this.data.map(row => row.map(value => value * scalar)))
  }

  getSubMatrix = (row: number, col: number): Matrix => {
    return new Matrix(this.data
      .filter((_, rowIndex) => rowIndex !== row)
      .map(row => row.components.filter((_, colIndex) => colIndex !== col)))
  }

  determinant(): number {
    if (!this.isSquare) throw new Error('Determinant is only defined for square matrices.')
    if (this.rows === 1) return this.get(0, 0)
    if (this.rows === 2) return this.get(0, 0) * this.get(1, 1) - this.get(0, 1) * this.get(1, 0)

    // Using Laplace expansion for determinant calculation
    const calculateDeterminant = (matrix: Matrix): number => {
      if (matrix.rows === 1) return matrix.get(0, 0)
      if (matrix.rows === 2) return matrix.get(0, 0) * matrix.get(1, 1) - matrix.get(0, 1) * matrix.get(1, 0)

      let det = 0
      for (let col = 0; col < matrix.cols; col++) {
        const subMatrix = this.getSubMatrix(0, col)
        det += (col % 2 === 0 ? 1 : -1) * matrix.get(0, col) * calculateDeterminant(subMatrix)
      }
      return det
    }
    
    return calculateDeterminant(this)
  }

  adjugate(): Matrix {
    if (!this.isSquare) throw new Error('Adjugate is only defined for square matrices.')
    const adj = new Matrix(Array.from({ length: this.rows }, () => Array(this.cols).fill(0)))
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const subMatrix = this.getSubMatrix(row, col)
        adj.set(col, row, (row + col) % 2 === 0 ? subMatrix.determinant() : -subMatrix.determinant())
      }
    }
    return adj
  }

  inverse(): Matrix {
    if (!this.isSquare) throw new Error('Inverse is only defined for square matrices.')
    const det = this.determinant()
    if (det === 0) throw new Error('Matrix is singular and cannot be inverted.')

    // Using adjugate method for matrix inversion
    const adjugate = this.adjugate()
    return adjugate.scale(1 / det)
  }

  isZero(): boolean {
    return this.data.every(row => row.isZero())
  }

  isIdentity(): boolean {
    if (!this.isSquare) return false
    return this.data.every((row, rowIndex) => {
      return row.components.every((value, colIndex) => {
        return value === (rowIndex === colIndex ? 1 : 0)
      })
    })
  }

  toString = (): string => this.data.map(row => `| ${row.components.join(' ')} |`).join('\n')
  toArray = (): number[][] => this.data.map(row => row.components)
}