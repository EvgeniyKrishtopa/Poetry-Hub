import type { Arrangement, BoardCollection, BoardPoem, Drop, PoemContainer } from "./work-ordering.types";

/** Whether two lists are the same list: the same collection, or both the free poems. */
export function isSameContainer(first: PoemContainer, second: PoemContainer): boolean {
  if (first.kind === "free" || second.kind === "free") return first.kind === second.kind;
  return first.collectionId === second.collectionId;
}

/** `toIndex` is a place in the list with the moved item taken out: below the start is the start, beyond the end is the end. */
function insertAt<T>(items: readonly T[], item: T, toIndex: number): T[] {
  const index = Math.min(Math.max(toIndex, 0), items.length);
  return [...items.slice(0, index), item, ...items.slice(index)];
}

function poemsOf(arrangement: Arrangement, container: PoemContainer): readonly BoardPoem[] | undefined {
  if (container.kind === "free") return arrangement.freePoems;
  return arrangement.collections.find((collection) => collection.id === container.collectionId)?.poems;
}

function withPoems(arrangement: Arrangement, container: PoemContainer, poems: readonly BoardPoem[]): Arrangement {
  if (container.kind === "free") return { ...arrangement, freePoems: poems };
  return {
    ...arrangement,
    collections: arrangement.collections.map(
      (collection): BoardCollection =>
        collection.id === container.collectionId ? { ...collection, poems } : collection,
    ),
  };
}

function isSameOrder<T extends { readonly id: string }>(first: readonly T[], second: readonly T[]): boolean {
  return first.length === second.length && first.every((item, index) => item.id === second[index]?.id);
}

function arrangePoemDrop(arrangement: Arrangement, drop: Extract<Drop, { kind: "poem" }>): Arrangement {
  const source = poemsOf(arrangement, drop.from);
  const target = poemsOf(arrangement, drop.to);
  const poem = source?.find((candidate) => candidate.id === drop.poemId);
  if (source === undefined || target === undefined || poem === undefined) return arrangement;

  const sourceWithout = source.filter((candidate) => candidate.id !== drop.poemId);
  if (isSameContainer(drop.from, drop.to)) {
    const reordered = insertAt(sourceWithout, poem, drop.toIndex);
    if (isSameOrder(source, reordered)) return arrangement;
    return withPoems(arrangement, drop.from, reordered);
  }

  return withPoems(withPoems(arrangement, drop.from, sourceWithout), drop.to, insertAt(target, poem, drop.toIndex));
}

function arrangeCollectionDrop(arrangement: Arrangement, drop: Extract<Drop, { kind: "collection" }>): Arrangement {
  const collection = arrangement.collections.find((candidate) => candidate.id === drop.collectionId);
  if (collection === undefined) return arrangement;

  const others = arrangement.collections.filter((candidate) => candidate.id !== drop.collectionId);
  const reordered = insertAt(others, collection, drop.toIndex);
  if (isSameOrder(arrangement.collections, reordered)) return arrangement;
  return { ...arrangement, collections: reordered };
}

/**
 * The arrangement after one drop, as the board shows it while the move is sending: the moved item at the dropped
 * place, every other item in its relative order, and the arrangement itself when nothing changed (FR-2 to FR-5).
 */
export function arrangeDrop(arrangement: Arrangement, drop: Drop): Arrangement {
  return drop.kind === "poem" ? arrangePoemDrop(arrangement, drop) : arrangeCollectionDrop(arrangement, drop);
}
