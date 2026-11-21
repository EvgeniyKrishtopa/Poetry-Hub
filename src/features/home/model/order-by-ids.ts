/**
 * The items in the order of `ids` (the admin's order); an id with no item is dropped, an item with no id is
 * ignored (FR-2, FR-4).
 */
export function orderByIds<Item>(
  ids: readonly string[],
  items: readonly Item[],
  getId: (item: Item) => string,
): readonly Item[] {
  void ids;
  void items;
  void getId;
  throw new Error("not implemented");
}
