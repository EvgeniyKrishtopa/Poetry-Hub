import type { Poem } from "./poem.types";

/**
 * Newest publication date first, then id, so equal dates keep a stable order. ISO dates compare
 * correctly as strings; `<` avoids locale-aware comparison.
 */
export function comparePoems(a: Poem, b: Poem): number {
  if (a.publishedAt !== b.publishedAt) return a.publishedAt < b.publishedAt ? 1 : -1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}
