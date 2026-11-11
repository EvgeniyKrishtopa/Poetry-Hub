"use client";

import {
  closestCenter,
  type CollisionDetection,
  type DndContextProps,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useEffect, useRef, useState } from "react";

import { announcementFor, type AnnouncementEvent } from "../../model/board-announcements";
import { arrangeOver, dropBetween, enteredContainer, stepArrangement } from "../../model/board-drag";
import { findPoem } from "../../model/board-lookup";
import {
  KEYBOARD_CODES,
  MOUSE_DRAG_DISTANCE_PX,
  TOUCH_HOLD_MS,
  TOUCH_HOLD_TOLERANCE_PX,
} from "../../model/work-ordering.constants";
import { WORK_BOARD_COPY } from "../../model/work-ordering-messages";
import type { StepDirection } from "../../model/board-places";
import type { Arrangement, DraggedItem, Drop, PoemContainer } from "../../model/work-ordering.types";

import { draggedItemOf, overTargetOf } from "./board-drag-ids";

const BOARD_ID = "work-board";
const HANDLE_ATTRIBUTE = "data-handle";

const DIRECTION_BY_CODE: Readonly<Record<string, StepDirection>> = { ArrowUp: "up", ArrowDown: "down" };
const IGNORED_ARROW_CODES: readonly string[] = ["ArrowLeft", "ArrowRight"];

/** The in-drag arrangement (design D4): the item held, and the board as it looks at this step. */
interface DragState {
  readonly item: DraggedItem;
  readonly arrangement: Arrangement;
  /** The list a held poem was taken from, `null` for a collection. */
  readonly origin: PoemContainer | null;
}

// The library's own live region stays silent: the island writes the only announcements (FR-7, NFR-4).
const SILENT_ANNOUNCEMENTS: NonNullable<DndContextProps["accessibility"]>["announcements"] = {
  onDragStart: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
};

/** A poem steps among poems and lists, a collection among collections only (design D8). */
const collisionDetection: CollisionDetection = (args) => {
  const item = draggedItemOf(args.active.data.current);
  const droppableContainers = args.droppableContainers.filter((container) => {
    const over = overTargetOf(container.data.current);
    if (over === null) return false;
    return item?.type === "collection" ? over.kind === "collection" : over.kind !== "collection";
  });
  return closestCenter({ ...args, droppableContainers });
};

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
  readonly announcement: string;
  readonly dndProps: Pick<
    DndContextProps,
    "id" | "sensors" | "collisionDetection" | "onDragStart" | "onDragOver" | "onDragEnd" | "onDragCancel" | "accessibility"
  >;
}

/**
 * The `@dnd-kit` glue (design D4, D8): sensors, the keyboard coordinate getter, the in-drag arrangement, the live
 * region text and focus repair. Every rule lives in the pure model functions; this hook only wires them to events.
 */
export function useBoardDrag({ arrangement, handlesDisabled, onDrop, stored }: UseBoardDragOptions): UseBoardDrag {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // The keyboard getter and the handlers read the latest step synchronously, before React re-renders.
  const dragRef = useRef<DragState | null>(null);
  const startRef = useRef<Arrangement>(arrangement);
  const focusRef = useRef<string | null>(null);

  function commit(next: DragState | null) {
    dragRef.current = next;
    setDrag(next);
  }

  function announce(event: AnnouncementEvent, before: Arrangement, after: Arrangement) {
    setAnnouncement(announcementFor(event, before, after));
  }

  // The coordinates never move: each step is applied to the arrangement itself, so the keyboard and the pointer end
  // in the same arrangement functions (design D8). Space is the only lift and drop key (KEYBOARD_CODES).
  const coordinateGetter: KeyboardCoordinateGetter = (event, { currentCoordinates }) => {
    if (IGNORED_ARROW_CODES.includes(event.code)) {
      event.preventDefault();
      return currentCoordinates;
    }
    const direction = DIRECTION_BY_CODE[event.code];
    if (direction === undefined) return undefined;
    event.preventDefault();

    const state = dragRef.current;
    if (state === null) return currentCoordinates;
    const next = stepArrangement(state.arrangement, state.item, direction);
    // The board's ends: nothing moves, nothing is announced, nothing wraps around.
    if (next === state.arrangement) return currentCoordinates;

    announce({ kind: "moved", item: state.item }, state.arrangement, next);
    commit({ ...state, arrangement: next });
    return currentCoordinates;
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: MOUSE_DRAG_DISTANCE_PX } }),
    useSensor(TouchSensor, { activationConstraint: { delay: TOUCH_HOLD_MS, tolerance: TOUCH_HOLD_TOLERANCE_PX } }),
    useSensor(KeyboardSensor, { keyboardCodes: KEYBOARD_CODES, coordinateGetter }),
  );

  function onDragStart(event: DragStartEvent) {
    const item = draggedItemOf(event.active.data.current);
    if (item === null) return;
    startRef.current = arrangement;
    const origin = item.type === "poem" ? (findPoem(arrangement, item.id)?.container ?? null) : null;
    commit({ item, arrangement, origin });
    announce({ kind: "picked", item }, arrangement, arrangement);
  }

  function onDragOver(event: DragOverEvent) {
    const state = dragRef.current;
    // A keyboard drag applies each place itself; the pointer geometry would only fight it.
    if (state === null || event.activatorEvent instanceof KeyboardEvent) return;
    const over = overTargetOf(event.over?.data.current);
    if (over === null) return;

    const next = arrangeOver(state.arrangement, state.item, over);
    if (next === state.arrangement) return;
    announce({ kind: "moved", item: state.item }, state.arrangement, next);
    commit({ ...state, arrangement: next });
  }

  function onDragEnd(event: DragEndEvent) {
    const state = dragRef.current;
    if (state === null) return;
    // A pointer drop on nothing cancels; a keyboard drop never has a geometric target, so it never does.
    if (event.over === null && !(event.activatorEvent instanceof KeyboardEvent)) {
      onDragCancel();
      return;
    }

    commit(null);
    announce({ kind: "dropped", item: state.item }, state.arrangement, state.arrangement);
    const drop = dropBetween(startRef.current, state.arrangement, state.item);
    if (drop === null) {
      // Dropped where it started: nothing is sent, and the handle takes focus back at once (FR-2).
      requestHandleFocus(state.item.id);
      return;
    }
    // After a stored drop focus is repaired by the island once the answer is in; a refusal keeps focus on its alert.
    onDrop(drop);
  }

  function onDragCancel() {
    const state = dragRef.current;
    commit(null);
    if (state === null) return;
    announce({ kind: "cancelled", item: state.item }, startRef.current, startRef.current);
    requestHandleFocus(state.item.id);
  }

  function requestHandleFocus(itemId: string) {
    focusRef.current = itemId;
  }

  // A stored drop repairs focus too; a refused one leaves it on its alert (FR-6, FR-11).
  useEffect(() => {
    if (stored !== null) focusRef.current = stored.kind === "poem" ? stored.poemId : stored.collectionId;
  }, [stored]);

  // A handle that moved between lists remounts and a natively disabled one can't take focus, so the repair runs after
  // a render in which the handle exists and is enabled; the library's own `restoreFocus` is off for that reason.
  useEffect(() => {
    const itemId = focusRef.current;
    if (itemId === null || handlesDisabled) return;
    const handle = document.querySelector<HTMLElement>(`[${HANDLE_ATTRIBUTE}="${CSS.escape(itemId)}"]`);
    if (handle === null) return;
    handle.focus();
    focusRef.current = null;
  });

  return {
    arrangement: drag?.arrangement ?? arrangement,
    activeItem: drag?.item ?? null,
    hoverContainer: drag?.item.type === "poem" && drag.origin !== null ? enteredContainer(drag.arrangement, drag.item.id, drag.origin) : null,
    announcement,
    dndProps: {
      id: BOARD_ID,
      sensors,
      collisionDetection,
      onDragStart,
      onDragOver,
      onDragEnd,
      onDragCancel,
      accessibility: {
        screenReaderInstructions: { draggable: WORK_BOARD_COPY.keyboardInstructions },
        announcements: SILENT_ANNOUNCEMENTS,
        restoreFocus: false,
      },
    },
  };
}
