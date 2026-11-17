/**
 * The items after the first that fails `predicate` (that one included), as Python's
 * itertools.dropwhile: dropwhile([1, 4, 6, 4, 1], x => x < 5) gives 6, 4, 1. Once one fails,
 * the rest come through without being checked.
 */
export function* dropwhile<T>(iterable: Iterable<T>, predicate: (value: T) => boolean): Generator<T> {
    let dropping = true
    for (const item of iterable) {
        if (dropping && predicate(item)) continue
        dropping = false
        yield item
    }
}
