import type { Poem } from "./poem.types";

/** Case-insensitive match on title or author. An empty query returns all poems. */
export function filterPoems(poems: readonly Poem[], query: string): readonly Poem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return poems;

  return poems.filter(
    (poem) =>
      poem.title.toLowerCase().includes(normalized) ||
      poem.author.toLowerCase().includes(normalized),
  );
}
