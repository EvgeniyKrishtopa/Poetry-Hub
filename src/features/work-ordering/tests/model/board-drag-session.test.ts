import { describe, expect, it } from "vitest";

import { beginDrag, cancelDrag, dragOver, endDrag, moveDrag } from "../../model/board-drag-session";
import type { DragState } from "../../model/board-drag-session.types";
import { stepArrangementByKeyboard } from "../../model/board-drag";
import type { DraggedItem } from "../../model/work-ordering.types";

import { BOARD, poemIds } from "./board-fixtures";

const poem = (id: string): DraggedItem => ({ type: "poem", id });
const collection = (id: string): DraggedItem => ({ type: "collection", id });

/** The state right after the item was lifted from `BOARD`. */
function liftedState(item: DraggedItem): DragState {
  const { state } = beginDrag(BOARD, item);
  if (state === null) throw new Error("beginDrag must answer with a state");
  return state;
}

/** The state after a pointer moved poem `a` over the poem `d` of another collection. */
function stateWithPoemAInWinter(): DragState {
  const { state } = dragOver(liftedState(poem("a")), { kind: "poem", poemId: "d" }, "pointer");
  if (state === null) throw new Error("dragOver must answer with a state");
  return state;
}

describe("beginDrag", () => {
  // implements FR-7 of drag-and-drop-ordering
  it("starts from the shown arrangement and announces the pick-up", () => {
    const transition = beginDrag(BOARD, poem("a"));

    expect(transition.state).toEqual({
      item: poem("a"),
      arrangement: BOARD,
      start: BOARD,
      origin: { kind: "collection", collectionId: "autumn" },
    });
    expect(transition.announcement).toEqual({ event: { kind: "picked", item: poem("a") }, before: BOARD, after: BOARD });
    expect(transition.drop).toBeNull();
    expect(transition.focusItemId).toBeNull();
  });

  it("remembers the free list as the origin of a free poem, and none for a collection", () => {
    expect(beginDrag(BOARD, poem("e")).state?.origin).toEqual({ kind: "free" });
    expect(beginDrag(BOARD, collection("autumn")).state?.origin).toBeNull();
  });

  it("has no origin for a poem the board does not hold", () => {
    expect(beginDrag(BOARD, poem("gone")).state?.origin).toBeNull();
  });
});

describe("dragOver", () => {
  // implements FR-3 of drag-and-drop-ordering
  it("shows the poem in the list it passes over and announces the move", () => {
    const lifted = liftedState(poem("a"));

    const transition = dragOver(lifted, { kind: "poem", poemId: "d" }, "pointer");

    expect(poemIds(transition.state?.arrangement ?? BOARD, "winter")).toEqual(["a", "d"]);
    expect(transition.state?.start).toBe(BOARD);
    expect(transition.announcement?.event).toEqual({ kind: "moved", item: poem("a") });
    expect(transition.announcement?.before).toBe(BOARD);
    expect(transition.drop).toBeNull();
    expect(transition.focusItemId).toBeNull();
  });

  // implements FR-7 of drag-and-drop-ordering: the keyboard path applies each place itself
  it("ignores pointer geometry during a keyboard drag", () => {
    const lifted = liftedState(poem("a"));

    expect(dragOver(lifted, { kind: "poem", poemId: "d" }, "keyboard")).toEqual({
      state: lifted,
      announcement: null,
      drop: null,
      focusItemId: null,
    });
  });

  it("changes and announces nothing when the pointer passes over the item's own place", () => {
    const lifted = liftedState(poem("a"));

    const transition = dragOver(lifted, { kind: "list", container: { kind: "collection", collectionId: "autumn" } }, "pointer");

    expect(transition.state).toBe(lifted);
    expect(transition.announcement).toBeNull();
  });
});

describe("moveDrag", () => {
  // implements FR-7 of drag-and-drop-ordering
  it("shows a keyboard step at once and announces it against the previous step", () => {
    const lifted = liftedState(poem("c"));
    const stepped = stepArrangementByKeyboard(BOARD, poem("c"), "up");

    const transition = moveDrag(lifted, stepped);

    expect(transition.state?.arrangement).toBe(stepped);
    expect(transition.state?.start).toBe(BOARD);
    expect(transition.announcement).toEqual({ event: { kind: "moved", item: poem("c") }, before: BOARD, after: stepped });
  });
});

describe("cancelDrag", () => {
  // implements FR-5 of drag-and-drop-ordering
  it("ends the drag, announces the cancel against the start, and gives focus back to the handle", () => {
    const moved = stateWithPoemAInWinter();

    const transition = cancelDrag(moved);

    expect(transition.state).toBeNull();
    expect(transition.announcement).toEqual({ event: { kind: "cancelled", item: poem("a") }, before: BOARD, after: BOARD });
    expect(transition.drop).toBeNull();
    expect(transition.focusItemId).toBe("a");
  });
});

describe("endDrag", () => {
  // implements FR-3 of drag-and-drop-ordering
  it("stores the move when the item ended somewhere new, and leaves focus to the answer", () => {
    const transition = endDrag(stateWithPoemAInWinter(), { activator: "pointer", isOverTarget: true });

    expect(transition.state).toBeNull();
    expect(transition.drop).toEqual({
      kind: "poem",
      poemId: "a",
      from: { kind: "collection", collectionId: "autumn" },
      to: { kind: "collection", collectionId: "winter" },
      toIndex: 0,
    });
    expect(transition.focusItemId).toBeNull();
    expect(transition.announcement?.event).toEqual({ kind: "dropped", item: poem("a") });
  });

  // implements FR-2 of drag-and-drop-ordering: nothing is sent for a drop where it started
  it("sends nothing and returns focus at once when the item ended where it started", () => {
    const transition = endDrag(liftedState(poem("a")), { activator: "pointer", isOverTarget: true });

    expect(transition.drop).toBeNull();
    expect(transition.focusItemId).toBe("a");
    expect(transition.announcement?.event).toEqual({ kind: "dropped", item: poem("a") });
  });

  // implements FR-5 of drag-and-drop-ordering: a pointer drop on nothing cancels
  it("cancels a pointer drop on nothing", () => {
    const moved = stateWithPoemAInWinter();

    expect(endDrag(moved, { activator: "pointer", isOverTarget: false })).toEqual(cancelDrag(moved));
  });

  // implements FR-7 of drag-and-drop-ordering: a keyboard drop has no geometric target and still drops
  it("drops a keyboard drag that has no target, and stores a step it took", () => {
    const stepped = stepArrangementByKeyboard(BOARD, poem("c"), "up");
    const lifted = liftedState(poem("c"));
    const moved = moveDrag(lifted, stepped).state;
    if (moved === null) throw new Error("moveDrag must answer with a state");

    const transition = endDrag(moved, { activator: "keyboard", isOverTarget: false });

    expect(transition.drop).toEqual({
      kind: "poem",
      poemId: "c",
      from: { kind: "collection", collectionId: "autumn" },
      to: { kind: "collection", collectionId: "autumn" },
      toIndex: 1,
    });
  });
});
