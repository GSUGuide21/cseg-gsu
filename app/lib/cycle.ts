/**
 * Repeats the items in order: ['a', 'b'] gives a, b, a, b, …. `limit` is how many times to go
 * through all of them, so cycle(['a', 'b'], 2) gives a, b, a, b, and a limit of 0 gives nothing,
 * as does an empty array. With no limit it never ends, so take what's needed from it with
 * next() or a loop that breaks, not with spread or Array.from.
 */
export function* cycle<T>(items: readonly T[], limit: number = Infinity): Generator<T, void, undefined> {
    for (let iterations = 0; iterations < limit && items.length > 0; iterations++) yield* items
}
