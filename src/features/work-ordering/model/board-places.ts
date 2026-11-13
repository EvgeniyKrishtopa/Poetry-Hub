import { isSameContainer } from "./arrange-drop";
import type { Arrangement, PoemContainer } from "./work-ordering.types";

/**
 * A place for a poem: a list and an index in that list with the lifted poem taken out, so `index` is the same number
 * a drop sends. A list of `n` other poems has `n + 1` places, an empty one has one.
 */
export interface Place {
  readonly container: PoemContainer;
  readonly index: number;
}

export type KeyboardStepDirection = "up" | "down";

/** The lists in reading order: each collection's poems, then the free poems. */
function listsInReadingOrder(arrangement: Arrangement): { container: PoemContainer; poemIds: readonly string[] }[] {
  return [
    ...arrangement.collections.map((collection) => ({
      container: { kind: "collection", collectionId: collection.id } satisfies PoemContainer,
      poemIds: collection.poems.map((poem) => poem.id),
    })),
    { container: { kind: "free" } satisfies PoemContainer, poemIds: arrangement.freePoems.map((poem) => poem.id) },
  ];
}

/** Every place a lifted poem can take, in the board's reading order (FR-7). */
export function boardPlaces(arrangement: Arrangement, poemId: string): readonly Place[] {
  return listsInReadingOrder(arrangement).flatMap(({ container, poemIds }) => {
    const others = poemIds.filter((id) => id !== poemId).length;
    return Array.from({ length: others + 1 }, (_, index): Place => ({ container, index }));
  });
}

/**
 * The place one ArrowUp or ArrowDown away from the current one, crossing from the end of a list into the start of
 * the next; `null` at the first and the last place of the board, with no wrap (FR-7).
 */
export function nextKeyboardPlace(
  arrangement: Arrangement,
  poemId: string,
  current: Place,
  direction: KeyboardStepDirection,
): Place | null {
  const places = boardPlaces(arrangement, poemId);
  const position = places.findIndex(
    (place) => isSameContainer(place.container, current.container) && place.index === current.index,
  );
  if (position === -1) return null;

  return places[direction === "down" ? position + 1 : position - 1] ?? null;
}

/**
 * The place one ArrowUp or ArrowDown away for a collection, among the collections only (FR-7). `index` is a place
 * with the lifted collection taken out, as in a drop; `null` at the first and the last place.
 */
export function nextKeyboardCollectionIndex(otherCollections: number, current: number, direction: KeyboardStepDirection): number | null {
  const next = direction === "down" ? current + 1 : current - 1;
  return next < 0 || next > otherCollections ? null : next;
}
