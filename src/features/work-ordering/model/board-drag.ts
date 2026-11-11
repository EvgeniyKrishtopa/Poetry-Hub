import { arrangeDrop, isSameContainer } from "./arrange-drop";
import { findPoem } from "./board-lookup";
import { nextCollectionIndex, nextPlace, type StepDirection } from "./board-places";
import type { Arrangement, DraggedItem, Drop, OverTarget, PoemContainer } from "./work-ordering.types";

// The in-drag arrangement is what the board shows while an item is held (design D4): a poem visibly enters another
// list, a collection visibly takes its place. These functions only compute it; nothing is sent before the drop.

/** The arrangement after a pointer drag moved `item` over `over`; the arrangement itself when nothing changes. */
export function arrangeOver(arrangement: Arrangement, item: DraggedItem, over: OverTarget): Arrangement {
  if (item.type === "collection") {
    // A collection never nests: it only follows the collections it passes over (FR-5).
    if (over.kind !== "collection") return arrangement;
    const toIndex = arrangement.collections.findIndex((collection) => collection.id === over.collectionId);
    return toIndex === -1 ? arrangement : arrangeDrop(arrangement, { kind: "collection", collectionId: item.id, toIndex });
  }

  const from = findPoem(arrangement, item.id);
  if (from === undefined) return arrangement;

  if (over.kind === "poem") {
    const target = findPoem(arrangement, over.poemId);
    if (target === undefined) return arrangement;
    return arrangeDrop(arrangement, {
      kind: "poem",
      poemId: item.id,
      from: from.container,
      to: target.container,
      toIndex: target.index,
    });
  }

  if (over.kind === "list") {
    // Over a list's own area (empty, or below its last row) a poem already in it stays; from another list it goes last.
    if (isSameContainer(from.container, over.container)) return arrangement;
    return arrangeDrop(arrangement, {
      kind: "poem",
      poemId: item.id,
      from: from.container,
      to: over.container,
      toIndex: Number.MAX_SAFE_INTEGER,
    });
  }

  return arrangement;
}

/** The arrangement after one ArrowUp or ArrowDown on a lifted item; the arrangement itself at the board's ends. */
export function stepArrangement(arrangement: Arrangement, item: DraggedItem, direction: StepDirection): Arrangement {
  if (item.type === "collection") {
    const current = arrangement.collections.findIndex((collection) => collection.id === item.id);
    if (current === -1) return arrangement;
    const toIndex = nextCollectionIndex(arrangement.collections.length - 1, current, direction);
    if (toIndex === null) return arrangement;
    return arrangeDrop(arrangement, { kind: "collection", collectionId: item.id, toIndex });
  }

  const from = findPoem(arrangement, item.id);
  if (from === undefined) return arrangement;
  const next = nextPlace(arrangement, item.id, { container: from.container, index: from.index }, direction);
  if (next === null) return arrangement;
  return arrangeDrop(arrangement, {
    kind: "poem",
    poemId: item.id,
    from: from.container,
    to: next.container,
    toIndex: next.index,
  });
}

/**
 * The move to store for a finished drag, or `null` when the item ended where it started (FR-2: nothing is sent).
 * `start` is the arrangement shown when the item was picked up; `final` is the in-drag one at the drop.
 */
export function dropBetween(start: Arrangement, final: Arrangement, item: DraggedItem): Drop | null {
  if (item.type === "collection") {
    const toIndex = final.collections.findIndex((collection) => collection.id === item.id);
    if (toIndex === -1) return null;
    const drop: Drop = { kind: "collection", collectionId: item.id, toIndex };
    return arrangeDrop(start, drop) === start ? null : drop;
  }

  const from = findPoem(start, item.id);
  const to = findPoem(final, item.id);
  if (from === undefined || to === undefined) return null;
  const drop: Drop = { kind: "poem", poemId: item.id, from: from.container, to: to.container, toIndex: to.index };
  return arrangeDrop(start, drop) === start ? null : drop;
}

/** The list a held poem has entered, or `null` while it is still in the list it came from: that collection is drawn as the target. */
export function enteredContainer(arrangement: Arrangement, poemId: string, origin: PoemContainer): PoemContainer | null {
  const current = findPoem(arrangement, poemId)?.container;
  if (current === undefined || isSameContainer(current, origin)) return null;
  return current;
}
