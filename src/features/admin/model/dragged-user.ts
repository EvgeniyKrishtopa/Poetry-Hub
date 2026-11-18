import type { DraggedUser } from "./violation.types";

/**
 * The user a dragged row carries in its dnd-kit `data`, or `null` for anything else, so a drop of something that is not
 * a user row adds nobody. dnd-kit hands the data over untyped.
 */
export function draggedUserOf(data: unknown): DraggedUser | null {
  if (typeof data !== "object" || data === null) return null;
  const { userId, email } = data as Record<string, unknown>;
  if (typeof userId !== "string" || typeof email !== "string") return null;
  return { userId, email };
}
