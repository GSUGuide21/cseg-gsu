// Complex numbers
export class ComplexNumber {
  public r: number
  public i: number

  constructor(r: number, i: number) {
    this.r = r
    this.i = i
  }

  add(other: ComplexNumber): ComplexNumber {
    return new ComplexNumber(this.r + other.r, this.i + other.i)
  }

  subtract(other: ComplexNumber): ComplexNumber {
    return new ComplexNumber(this.r - other.r, this.i - other.i)
  }

  multiply(other: ComplexNumber): ComplexNumber {
    const r = this.r * other.r - this.i * other.i
    const i = this.r * other.i + this.i * other.r
    return new ComplexNumber(r, i)
  }

  divide(other: ComplexNumber): ComplexNumber {
    const denominator = other.r * other.r + other.i * other.i
    if (denominator === 0) throw new Error('Division by zero is not allowed')
    const r = (this.r * other.r + this.i * other.i) / denominator
    const i = (this.i * other.r - this.r * other.i) / denominator
    return new ComplexNumber(r, i)
  }

  modulus = (): number => Math.sqrt(this.r * this.r + this.i * this.i)
  argument = (): number => Math.atan2(this.i, this.r)
  conjugate = (): ComplexNumber => new ComplexNumber(this.r, -this.i)
}