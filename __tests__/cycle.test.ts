import { cycle } from '@/lib/cycle'

const take = <T>(from: Generator<T, void, undefined>, count: number) => Array.from({ length: count }, () => from.next().value)

describe('cycle', () => {
  it('repeats the items in order', () => {
    expect(take(cycle(['a', 'b', 'c']), 7)).toEqual(['a', 'b', 'c', 'a', 'b', 'c', 'a'])
  })

  it('repeats a single item', () => {
    expect(take(cycle([1]), 3)).toEqual([1, 1, 1])
  })

  it('ends straight away on an empty array', () => {
    expect(cycle([]).next()).toEqual({ value: undefined, done: true })
  })

  it('keeps items that are themselves undefined', () => {
    expect(take(cycle([undefined, 0]), 3)).toEqual([undefined, 0, undefined])
  })

  it('ends if the array is emptied while it runs', () => {
    const items = ['a']
    const from = cycle(items)
    from.next()
    items.length = 0
    expect(from.next().done).toBe(true)
  })

  it('keeps each generator’s place separate', () => {
    const items = ['a', 'b']
    const first = cycle(items)
    first.next()
    expect(first.next().value).toBe('b')
    expect(cycle(items).next().value).toBe('a')
  })
})
