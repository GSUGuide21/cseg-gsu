interface ProductOptions {
    /** How many times over to take the iterables, as Python's itertools.product: `product(a, { repeat: 2 })` is `product(a, a)` */
    repeat?: number
}

/** The type of what each iterable gives, in order: [Iterable<A>, Iterable<B>] → [A, B] */
type Items<T extends readonly Iterable<unknown>[]> = { -readonly [K in keyof T]: T[K] extends Iterable<infer V> ? V : never }

const isIterable = (value: unknown): value is Iterable<unknown> => typeof (value as { [Symbol.iterator]?: unknown } | null)?.[Symbol.iterator] === 'function'

/**
 * Every combination that takes one item from each iterable, in order, the last one changing
 * fastest: product([1, 2], 'ab') gives [1, 'a'], [1, 'b'], [2, 'a'], [2, 'b']. With
 * `{ repeat: n }` the iterables are taken n times over. An empty iterable means no
 * combinations; no iterables at all (or a repeat of 0) means one, empty.
 *
 * Each iterable is read once, up front, so a generator works as well as an array.
 */
export function product<T extends readonly Iterable<unknown>[]>(...iterables: T): Generator<Items<T>>
export function product<T>(iterable: Iterable<T>, options: ProductOptions): Generator<T[]>
export function product<T extends readonly Iterable<unknown>[]>(...iterables: [...T, ProductOptions]): Generator<Items<T>[number][]>
export function* product(...args: (Iterable<unknown> | ProductOptions)[]): Generator<unknown[]> {
    const last = args[args.length - 1]
    const options = args.length && !isIterable(last) ? (last as ProductOptions) : {}
    const iterables = (options === last ? args.slice(0, -1) : args) as Iterable<unknown>[]
    const repeat = options.repeat ?? 1
    if (!Number.isInteger(repeat) || repeat < 0) throw new RangeError(`repeat must be a whole number, 0 or more (got ${repeat})`)

    const once = iterables.map((it) => [...it])
    const pools = Array.from({ length: repeat }, () => once).flat()
    if (pools.some((pool) => pool.length === 0)) return

    // Like an odometer: each step turns the last wheel, and a wheel that comes round turns the one before it
    const at = pools.map(() => 0)
    while (true) {
        yield pools.map((pool, i) => pool[at[i]])
        let i = pools.length - 1
        while (i >= 0 && ++at[i] === pools[i].length) {
            at[i] = 0
            i--
        }
        if (i < 0) return
    }
}
