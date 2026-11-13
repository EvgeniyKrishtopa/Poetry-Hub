import { closestCenter, type CollisionDetection, type DndContextProps } from "@dnd-kit/core";

import { WORK_BOARD_COPY } from "../../model/work-ordering-messages";

import { draggedItemOf, overTargetOf } from "./board-drag-ids";

export const BOARD_ID = "work-board";

// The library's own live region stays silent: the board writes the only announcements (FR-7, NFR-4).
const SILENT_SCREEN_READER_ANNOUNCEMENTS: NonNullable<DndContextProps["accessibility"]>["announcements"] = {
  onDragStart: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
};

export const BOARD_ACCESSIBILITY: NonNullable<DndContextProps["accessibility"]> = {
  screenReaderInstructions: { draggable: WORK_BOARD_COPY.screenReaderInstructions },
  announcements: SILENT_SCREEN_READER_ANNOUNCEMENTS,
  restoreFocus: false,
};

/** A poem steps among poems and lists, a collection among collections only (design D8). */
export const boardCollisionDetection: CollisionDetection = (args) => {
  const item = draggedItemOf(args.active.data.current);
  const droppableContainers = args.droppableContainers.filter((container) => {
    const over = overTargetOf(container.data.current);
    if (over === null) return false;
    return item?.type === "collection" ? over.kind === "collection" : over.kind !== "collection";
  });
  return closestCenter({ ...args, droppableContainers });
};
