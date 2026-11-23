import type { HomeEntry } from "./home-entry.types";

export interface HomeEntryMove {
  readonly id: string;
  /** 1-based place the entry is dropped on. */
  readonly toPosition: number;
}

/**
 * The list as it reads after an entry is dropped on a place: the entry leaves its slot, takes the target one, the
 * others close ranks, and every position is renumbered. An unknown id changes nothing.
 */
export function reorderHomeEntries(entries: readonly HomeEntry[], move: HomeEntryMove): readonly HomeEntry[] {
  const fromIndex = entries.findIndex((entry) => entry.id === move.id);
  if (fromIndex === -1) return entries;

  const toIndex = Math.min(Math.max(move.toPosition - 1, 0), entries.length - 1);
  const reordered = [...entries];
  const [moved] = reordered.splice(fromIndex, 1);
  if (moved === undefined) return entries;
  reordered.splice(toIndex, 0, moved);

  return reordered.map((entry, index) => ({ ...entry, position: index + 1 }));
}
