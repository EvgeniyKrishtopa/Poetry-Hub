import type { ScreenReaderAnnouncementEvent } from "./screen-reader-announcements";
import type { Arrangement, DraggedItem, Drop, PoemContainer } from "./work-ordering.types";

/** What lifted the item. The board reads it from the library's event; the rules below depend only on this. */
export type DragActivator = "keyboard" | "pointer";

/** The in-drag arrangement (design D4): the item held, and the board as it looks at this step. */
export interface DragState {
  readonly item: DraggedItem;
  readonly arrangement: Arrangement;
  /** The arrangement shown when the item was lifted: where a cancel returns to and what a drop is compared with. */
  readonly start: Arrangement;
  /** The list a held poem was taken from, `null` for a collection. */
  readonly origin: PoemContainer | null;
}

/** One phrase for the board's live region: `before` is the previous step's arrangement, `after` the current one. */
export interface ScreenReaderAnnouncementRequest {
  readonly event: ScreenReaderAnnouncementEvent;
  readonly before: Arrangement;
  readonly after: Arrangement;
}

/**
 * What a drag event leads to: the next state (`null` once the drag is over) and the effects the board applies.
 * A field that is `null` means that effect does not happen; a transition with the same `state` and no effect is a
 * no-op.
 */
export interface DragTransition {
  readonly state: DragState | null;
  readonly announcement: ScreenReaderAnnouncementRequest | null;
  /** The move to store, only when the item ended somewhere new. */
  readonly drop: Drop | null;
  /** The item whose handle takes focus back at once. */
  readonly focusItemId: string | null;
}

/** What the library says about how a drag ended. */
export interface DragEndInput {
  readonly activator: DragActivator;
  /** Whether the item ended over a droppable. A keyboard drop never has one. */
  readonly isOverTarget: boolean;
}
