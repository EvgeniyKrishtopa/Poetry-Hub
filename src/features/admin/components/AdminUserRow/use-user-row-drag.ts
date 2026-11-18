"use client";

import { useDraggable } from "@dnd-kit/core";
import type { CSSProperties } from "react";

import type { DraggedUser } from "../../model/violation.types";

/**
 * Makes a user row draggable by its handle: the row follows the pointer, and the user it carries is what a drop on the
 * review-list link reads (FR-3). Outside a `DndContext` or when `disabled`, nothing can be lifted.
 */
export function useUserRowDrag(user: DraggedUser, disabled: boolean) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: user.userId,
    data: user,
    disabled,
  });
  const style: CSSProperties | undefined =
    transform === null ? undefined : { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` };

  return { attributes, listeners, setNodeRef, setActivatorNodeRef, style, isDragging };
}
