// Vectors
export class Vector {
  public components: number[]

  static zero(size: number): Vector {
    return new Vector(Array(size).fill(0))
  }

  static fromArray(array: number[]): Vector {
    return new Vector(array)
  }

  constructor(components: number[]) {
    this.components = components
  }

  get size(): number {
    return this.components.length
  }

  get(index: number): number {
    if (index < 0 || index >= this.size) throw new Error('Index out of bounds.')
    return this.components[index]
  }

  set(index: number, value: number): void {
    if (index < 0 || index >= this.size) throw new Error('Index out of bounds.')
    this.components[index] = value
  }

  forEach(callback: (value: number, index: number) => void): void {
    this.components.forEach((value, index) => {
      callback(value, index)
    })
  }

  tap(callback: (value: number, index: number) => void): this {
    this.forEach(callback)
    return this
  }

  map(callback: (value: number, index: number) => number): Vector {
    return new Vector(this.components.map((value, index) => callback(value, index)))
  }

  add(other: Vector): Vector {
    if (this.size !== other.size) throw new Error('Vectors must have the same size')
    return new Vector(this.components.map((value, index) => value + other.components[index]))
  }

  subtract(other: Vector): Vector {
    if (this.size !== other.size) throw new Error('Vectors must have the same size')
    return new Vector(this.components.map((value, index) => value - other.components[index]))
  }

  scale(scalar: number): Vector {
    return new Vector(this.components.map(value => value * scalar))
  }

  multiply(other: Vector): number {
    if (this.size !== other.size) throw new Error('Vectors must have the same size')
    return this.components.reduce((sum, value, index) => sum + value * other.components[index], 0)
  }

  divide(scalar: number): Vector {
    if (scalar === 0) throw new Error('Division by zero is not allowed')
    return new Vector(this.components.map(value => value / scalar))
  }

  dot = (other: Vector): number => {
    if (this.size !== other.size) throw new Error('Vectors must have the same size')
    return this.components.reduce((sum, value, index) => sum + value * other.components[index], 0)
  }

  isZero = (): boolean => this.components.every(value => value === 0)
  magnitude = (): number => Math.sqrt(this.dot(this))
  length = this.magnitude

  distance = (other: Vector): number => {
    if (this.size !== other.size) throw new Error('Vectors must have the same size')
    return Math.sqrt(this.components.reduce((sum, value, index) => sum + Math.pow(value - other.components[index], 2), 0))
  }
  
  normalize = (): Vector => {
    const mag = this.magnitude()
    if (mag === 0) throw new Error('Cannot normalize a zero vector')
    return this.divide(mag)
  }
  
  angle = (other: Vector): number => {
    const dotProduct = this.dot(other)
    const magnitudes = this.magnitude() * other.magnitude()
    if (magnitudes === 0) throw new Error('Cannot calculate angle with a zero vector')
    return Math.acos(dotProduct / magnitudes)
  }

  clone = (): Vector => new Vector([...this.components])

  toString = (): string => `(${this.components.join(', ')})`
  toArray = (): number[] => [...this.components]
}

export class Vector2D extends Vector {
  constructor(x: number, y: number) {
    super([x, y])
  }

  get x(): number {
    return this.components[0]
  }

  set x(value: number) {
    this.components[0] = value
  }

  get y(): number {
    return this.components[1]
  }

  set y(value: number) {
    this.components[1] = value
  }

  add(other: Vector): Vector2D {
    if (this.size !== other.size) throw new Error('Vectors must have the same size')
    const x = this.x + (other instanceof Vector2D ? other.x : other.components[0])
    const y = this.y + (other instanceof Vector2D ? other.y : other.components[1])
    return new Vector2D(x, y)
  }

  subtract(other: Vector): Vector2D {
    if (this.size !== other.size) throw new Error('Vectors must have the same size')
    const x = this.x - (other instanceof Vector2D ? other.x : other.components[0])
    const y = this.y - (other instanceof Vector2D ? other.y : other.components[1])
    return new Vector2D(x, y)
  }

  scale(scalar: number): Vector2D {
    const x = this.x * scalar
    const y = this.y * scalar
    return new Vector2D(x, y)
  }

  multiply(other: Vector): number {
    if (this.size !== other.size) throw new Error('Vectors must have the same size')
    return this.x * (other instanceof Vector2D ? other.x : other.components[0]) + this.y * (other instanceof Vector2D ? other.y : other.components[1])
  }

  divide(scalar: number): Vector2D {
    if (scalar === 0) throw new Error('Division by zero is not allowed')
    const x = this.x / scalar
    const y = this.y / scalar
    return new Vector2D(x, y)
  }

  rotate = (angle: number): Vector2D => {
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    return new Vector2D(this.x * cosAngle - this.y * sinAngle, this.x * sinAngle + this.y * cosAngle)
  }

  clone: () => Vector2D = () => new Vector2D(this.x, this.y)

  toString = (): string => `(${this.x}, ${this.y})`
  toArray = (): number[] => [this.x, this.y]

  static fromPolar = (magnitude: number, angle: number): Vector2D => {
    const x = magnitude * Math.cos(angle)
    const y = magnitude * Math.sin(angle)
    return new Vector2D(x, y)
  }

  static fromArray = (array: number[]): Vector2D => {
    if (array.length !== 2) throw new Error('Array must have exactly 2 elements')
    return new Vector2D(array[0], array[1])
  }
}

export class Vector3D extends Vector {
  constructor(x: number, y: number, z: number) {
    super([x, y, z])
  }

  get x(): number {
    return this.components[0]
  }

  set x(value: number) {
    this.components[0] = value
  }

  get y(): number {
    return this.components[1]
  }

  set y(value: number) {
    this.components[1] = value
  }

  get z(): number {
    return this.components[2]
  }

  set z(value: number) {
    this.components[2] = value
  }

  add(other: Vector): Vector3D {
    if (this.size !== other.size) throw new Error('Vectors must have the same size')
    const x = this.x + (other instanceof Vector3D ? other.x : other.components[0])
    const y = this.y + (other instanceof Vector3D ? other.y : other.components[1])
    const z = this.z + (other instanceof Vector3D ? other.z : other.components[2])
    return new Vector3D(x, y, z)
  }

  subtract(other: Vector): Vector3D {
    if (this.size !== other.size) throw new Error('Vectors must have the same size')
    const x = this.x - (other instanceof Vector3D ? other.x : other.components[0])
    const y = this.y - (other instanceof Vector3D ? other.y : other.components[1])
    const z = this.z - (other instanceof Vector3D ? other.z : other.components[2])
    return new Vector3D(x, y, z)
  }

  scale(scalar: number): Vector3D {
    const x = this.x * scalar
    const y = this.y * scalar
    const z = this.z * scalar
    return new Vector3D(x, y, z)
  }

  multiply(other: Vector): number {
    if (this.size !== other.size) throw new Error('Vectors must have the same size')
    return this.x * (other instanceof Vector3D ? other.x : other.components[0]) + this.y * (other instanceof Vector3D ? other.y : other.components[1]) + this.z * (other instanceof Vector3D ? other.z : other.components[2])
  }

  divide(scalar: number): Vector3D {
    if (scalar === 0) throw new Error('Division by zero is not allowed')
    const x = this.x / scalar
    const y = this.y / scalar
    const z = this.z / scalar
    return new Vector3D(x, y, z)
  }

  cross(other: Vector): Vector3D {
    if (this.size !== other.size) throw new Error('Vectors must have the same size')
    const x = this.y * (other instanceof Vector3D ? other.z : other.components[2]) - this.z * (other instanceof Vector3D ? other.y : other.components[1])
    const y = this.z * (other instanceof Vector3D ? other.x : other.components[0]) - this.x * (other instanceof Vector3D ? other.z : other.components[2])
    const z = this.x * (other instanceof Vector3D ? other.y : other.components[1]) - this.y * (other instanceof Vector3D ? other.x : other.components[0])
    return new Vector3D(x, y, z)
  }

  crossProduct = this.cross

  clone: () => Vector3D = () => new Vector3D(this.x, this.y, this.z)

  toString = (): string => `(${this.x}, ${this.y}, ${this.z})`

  static fromArray = (array: number[]): Vector3D => {
    if (array.length !== 3) throw new Error('Array must have exactly 3 elements')
    return new Vector3D(array[0], array[1], array[2])
  }
}