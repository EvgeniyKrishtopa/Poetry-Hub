import { arrangeOverByPointer, dropBetween } from "./board-drag";
import type { DragEndInput, DragActivator, DragState, DragTransition } from "./board-drag-session.types";
import { findPoem } from "./board-lookup";
import type { Arrangement, DraggedItem, OverTarget } from "./work-ordering.types";

// The life of one drag, as pure steps (design D4, D8). Each function takes what happened and answers with a
// `DragTransition`: the next state plus the effects to apply. The board's hook only reads the library's event, calls
// one of these, and applies the answer; no rule lives there.

function unchanged(state: DragState): DragTransition {
  return { state, announcement: null, drop: null, focusItemId: null };
}

/** The item is lifted: the board starts from `arrangement` and announces the pick-up. */
export function beginDrag(arrangement: Arrangement, item: DraggedItem): DragTransition {
  const origin = item.type === "poem" ? (findPoem(arrangement, item.id)?.container ?? null) : null;
  return {
    state: { item, arrangement, start: arrangement, origin },
    announcement: { event: { kind: "picked", item }, before: arrangement, after: arrangement },
    drop: null,
    focusItemId: null,
  };
}

/** The held item took a step to `arrangement`: shown at once and announced. Nothing is stored before the drop. */
export function moveDrag(state: DragState, arrangement: Arrangement): DragTransition {
  return {
    state: { ...state, arrangement },
    announcement: { event: { kind: "moved", item: state.item }, before: state.arrangement, after: arrangement },
    drop: null,
    focusItemId: null,
  };
}

/** The held item passes over `over`. A keyboard drag applies each place itself, so pointer geometry never moves it. */
export function dragOver(state: DragState, over: OverTarget, activator: DragActivator): DragTransition {
  if (activator === "keyboard") return unchanged(state);
  const next = arrangeOverByPointer(state.arrangement, state.item, over);
  if (next === state.arrangement) return unchanged(state);
  return moveDrag(state, next);
}

/** The drag is cancelled: the board returns to where it started, announces it, and the handle takes focus back. */
export function cancelDrag(state: DragState): DragTransition {
  return {
    state: null,
    announcement: { event: { kind: "cancelled", item: state.item }, before: state.start, after: state.start },
    drop: null,
    focusItemId: state.item.id,
  };
}

/**
 * The item is let go. A pointer drop on nothing cancels; a keyboard drop never has a target, so it never does. Where
 * the item ended somewhere new the move is stored (and focus is repaired once the answer is in); where it started
 * nothing is sent and the handle takes focus back at once (FR-2).
 */
export function endDrag(state: DragState, { activator, isOverTarget }: DragEndInput): DragTransition {
  if (activator === "pointer" && !isOverTarget) return cancelDrag(state);

  const drop = dropBetween(state.start, state.arrangement, state.item);
  return {
    state: null,
    announcement: { event: { kind: "dropped", item: state.item }, before: state.arrangement, after: state.arrangement },
    drop,
    focusItemId: drop === null ? state.item.id : null,
  };
}
