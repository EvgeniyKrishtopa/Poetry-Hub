import type { DraggedItem, OverTarget, PoemContainer } from "../../model/work-ordering.types";

// The island's hook is the only place that translates between the library's ids and data and the model's places,
// so the two id schemes cannot drift (design D8).

const LIST_ID_PREFIX = "list:";
const FREE_LIST_KEY = "free";

/** What each registered item or list carries in its droppable/draggable `data`. */
export type BoardData =
  | { readonly kind: "poem" | "collection"; readonly id: string }
  | { readonly kind: "list"; readonly container: PoemContainer };

export function listDroppableId(container: PoemContainer): string {
  return `${LIST_ID_PREFIX}${container.kind === "free" ? FREE_LIST_KEY : container.collectionId}`;
}

function isBoardData(value: unknown): value is BoardData {
  if (typeof value !== "object" || value === null || !("kind" in value)) return false;
  if (value.kind === "list") return "container" in value;
  return (value.kind === "poem" || value.kind === "collection") && "id" in value && typeof value.id === "string";
}

/** The dragged item behind a draggable's `data`, or `null` for anything else. */
export function draggedItemOf(data: unknown): DraggedItem | null {
  if (!isBoardData(data) || data.kind === "list") return null;
  return { type: data.kind, id: data.id };
}

/** What a droppable's `data` says the item is over, in model terms, or `null` for anything else. */
export function overTargetOf(data: unknown): OverTarget | null {
  if (!isBoardData(data)) return null;
  if (data.kind === "list") return { kind: "list", container: data.container };
  return data.kind === "poem" ? { kind: "poem", poemId: data.id } : { kind: "collection", collectionId: data.id };
}
