export function* takewhile<T>(iterable: Iterable<T>, predicate: (value: T) => boolean) {
  for (const item of iterable) {
    if (!predicate(item)) break
    yield item
  }
}