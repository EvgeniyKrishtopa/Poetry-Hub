import { stepArrangement } from "./board-drag";
import type { StepDirection } from "./board-places";
import type { Arrangement, DraggedItem } from "./work-ordering.types";

// The keyboard rules of a lifted item (FR-7, design D8). Space lifts and drops and Escape cancels: those two are the
// library's (KEYBOARD_CODES). This module owns the arrows: ArrowUp and ArrowDown step the item one place through the
// same arrangement functions the pointer ends in, ArrowLeft and ArrowRight do nothing, any other key is not ours.

const DIRECTION_BY_CODE: Readonly<Record<string, StepDirection>> = { ArrowUp: "up", ArrowDown: "down" };
const SWALLOWED_ARROW_CODES: readonly string[] = ["ArrowLeft", "ArrowRight"];

/** The item held and the board as it looks at this step. */
export interface HeldItem {
  readonly item: DraggedItem;
  readonly arrangement: Arrangement;
}

/** What a key press means for a lifted item. */
export type KeyboardDragOutcome =
  /** Not a board key: the library handles it (Space, Escape, Tab) and the browser's default stays. */
  | { readonly kind: "ignored" }
  /** The key is taken and nothing moves: a sideways arrow, a step at the board's ends, or no item held. */
  | { readonly kind: "consumed" }
  /** The key is taken and the item took one step: the arrangement to show next. */
  | { readonly kind: "moved"; readonly arrangement: Arrangement };

/** Decides what the key `code` does to the `held` item, `null` when nothing is held. Pure: nothing is announced or stored here. */
export function resolveKeyboardDrag(code: string, held: HeldItem | null): KeyboardDragOutcome {
  if (SWALLOWED_ARROW_CODES.includes(code)) return { kind: "consumed" };

  const direction = DIRECTION_BY_CODE[code];
  if (direction === undefined) return { kind: "ignored" };
  if (held === null) return { kind: "consumed" };

  const next = stepArrangement(held.arrangement, held.item, direction);
  // The board's ends: nothing moves, nothing wraps around.
  if (next === held.arrangement) return { kind: "consumed" };
  return { kind: "moved", arrangement: next };
}
