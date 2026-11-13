"use client";

import type {
  DndContextProps,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { useRef, useState } from "react";

import { arrangeOverByPointer, dropBetween, enteredContainer } from "../../model/board-drag";
import { findPoem } from "../../model/board-lookup";
import { resolveKeyboardDrag } from "../../model/keyboard-drag-step";
import type { Arrangement, DraggedItem, Drop, PoemContainer } from "../../model/work-ordering.types";

import { BOARD_ACCESSIBILITY, BOARD_ID, boardCollisionDetection } from "./board-dnd-config";
import { draggedItemOf, overTargetOf } from "./board-drag-ids";
import { useScreenReaderAnnouncement } from "./use-screen-reader-announcement";
import { useBoardSensors } from "./use-board-sensors";
import { useHandleFocusRepair } from "./use-handle-focus-repair";

/** The in-drag arrangement (design D4): the item held, and the board as it looks at this step. */
interface DragState {
  readonly item: DraggedItem;
  readonly arrangement: Arrangement;
  /** The list a held poem was taken from, `null` for a collection. */
  readonly origin: PoemContainer | null;
}

interface UseBoardDragOptions {
  /** The arrangement the board shows when nothing is held: the optimistic one while a move sends, else the stored one. */
  readonly arrangement: Arrangement;
  /** True while a handle must not start a drag (a move is sending, or the connection is not normal). */
  readonly handlesDisabled: boolean;
  /** Called once with the move to store when a drag ends somewhere new. */
  readonly onDrop: (drop: Drop) => void;
  /** The last drop the server stored, a new object each time: its handle takes focus back (FR-7). */
  readonly stored: Drop | null;
}

interface UseBoardDrag {
  /** What to render: the in-drag arrangement while an item is held, else the one given. */
  readonly arrangement: Arrangement;
  readonly activeItem: DraggedItem | null;
  /** The list a held poem has entered, when it differs from the one it came from. */
  readonly hoverContainer: PoemContainer | null;
  /** The text of the board's own polite live region. */
  readonly screenReaderAnnouncement: string;
  readonly dndProps: Pick<
    DndContextProps,
    "id" | "sensors" | "collisionDetection" | "onDragStart" | "onDragOver" | "onDragEnd" | "onDragCancel" | "accessibility"
  >;
}

/**
 * The `@dnd-kit` glue (design D4, D8): the in-drag arrangement and the four drag handlers. Sensors, the keyboard rules,
 * the live region text and focus repair each live in their own module; every arrangement rule is a pure model function.
 */
export function useBoardDrag({ arrangement, handlesDisabled, onDrop, stored }: UseBoardDragOptions): UseBoardDrag {
  const [drag, setDrag] = useState<DragState | null>(null);
  // The keyboard getter and the handlers read the latest step synchronously, before React re-renders.
  const latestDragRef = useRef<DragState | null>(null);
  const dragStartArrangementRef = useRef<Arrangement>(arrangement);

  const { screenReaderAnnouncement, announceToScreenReader } = useScreenReaderAnnouncement();
  const { queueHandleFocus } = useHandleFocusRepair({ handlesDisabled, stored });

  function updateDragState(next: DragState | null) {
    latestDragRef.current = next;
    setDrag(next);
  }

  // The coordinates never move: each step is applied to the arrangement itself, so the keyboard and the pointer end in
  // the same arrangement functions (design D8). The rules are in `resolveKeyboardDrag`.
  const getKeyboardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates }) => {
    const state = latestDragRef.current;
    const outcome = resolveKeyboardDrag(event.code, state);
    if (outcome.kind === "ignored") return undefined;

    event.preventDefault();
    if (outcome.kind === "moved" && state !== null) {
      announceToScreenReader({ kind: "moved", item: state.item }, state.arrangement, outcome.arrangement);
      updateDragState({ ...state, arrangement: outcome.arrangement });
    }
    return currentCoordinates;
  };

  const sensors = useBoardSensors(getKeyboardCoordinates);

  function onDragStart(event: DragStartEvent) {
    const item = draggedItemOf(event.active.data.current);
    if (item === null) return;
    dragStartArrangementRef.current = arrangement;
    const origin = item.type === "poem" ? (findPoem(arrangement, item.id)?.container ?? null) : null;
    updateDragState({ item, arrangement, origin });
    announceToScreenReader({ kind: "picked", item }, arrangement, arrangement);
  }

  function onDragOver(event: DragOverEvent) {
    const state = latestDragRef.current;
    // A keyboard drag applies each place itself; the pointer geometry would only fight it.
    if (state === null || event.activatorEvent instanceof KeyboardEvent) return;
    const over = overTargetOf(event.over?.data.current);
    if (over === null) return;

    const next = arrangeOverByPointer(state.arrangement, state.item, over);
    if (next === state.arrangement) return;
    announceToScreenReader({ kind: "moved", item: state.item }, state.arrangement, next);
    updateDragState({ ...state, arrangement: next });
  }

  function onDragEnd(event: DragEndEvent) {
    const state = latestDragRef.current;
    if (state === null) return;
    // A pointer drop on nothing cancels; a keyboard drop never has a geometric target, so it never does.
    if (event.over === null && !(event.activatorEvent instanceof KeyboardEvent)) {
      onDragCancel();
      return;
    }

    updateDragState(null);
    announceToScreenReader({ kind: "dropped", item: state.item }, state.arrangement, state.arrangement);
    const drop = dropBetween(dragStartArrangementRef.current, state.arrangement, state.item);
    if (drop === null) {
      // Dropped where it started: nothing is sent, and the handle takes focus back at once (FR-2).
      queueHandleFocus(state.item.id);
      return;
    }
    // After a stored drop focus is repaired once the answer is in; a refusal keeps focus on its alert.
    onDrop(drop);
  }

  function onDragCancel() {
    const state = latestDragRef.current;
    updateDragState(null);
    if (state === null) return;
    announceToScreenReader({ kind: "cancelled", item: state.item }, dragStartArrangementRef.current, dragStartArrangementRef.current);
    queueHandleFocus(state.item.id);
  }

  return {
    arrangement: drag?.arrangement ?? arrangement,
    activeItem: drag?.item ?? null,
    hoverContainer:
      drag?.item.type === "poem" && drag.origin !== null ? enteredContainer(drag.arrangement, drag.item.id, drag.origin) : null,
    screenReaderAnnouncement,
    dndProps: {
      id: BOARD_ID,
      sensors,
      collisionDetection: boardCollisionDetection,
      onDragStart,
      onDragOver,
      onDragEnd,
      onDragCancel,
      accessibility: BOARD_ACCESSIBILITY,
    },
  };
}
