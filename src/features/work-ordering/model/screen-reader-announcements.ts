import { isSameContainer } from "./arrange-drop";
import { findPoem } from "./board-lookup";
import { SCREEN_READER_ANNOUNCEMENTS } from "./work-ordering-messages";
import type { Arrangement, DraggedItem } from "./work-ordering.types";

export interface ScreenReaderAnnouncementEvent {
  readonly kind: "picked" | "moved" | "dropped" | "cancelled";
  readonly item: DraggedItem;
}

function describePoemStepForScreenReader(event: ScreenReaderAnnouncementEvent, before: Arrangement, after: Arrangement): string {
  const now = findPoem(after, event.item.id);
  if (now === undefined) return "";
  if (event.kind === "picked") return SCREEN_READER_ANNOUNCEMENTS.picked(now.poem.title);
  if (event.kind === "cancelled") return SCREEN_READER_ANNOUNCEMENTS.cancelled(now.poem.title);

  const position = now.index + 1;
  // The "placed in <list>" phrase is for a change of list since the previous step only; the drop itself compares equal.
  const previous = findPoem(before, event.item.id);
  const listChanged = previous !== undefined && !isSameContainer(previous.container, now.container);
  if (!listChanged) return SCREEN_READER_ANNOUNCEMENTS.position(now.poem.title, position, now.total);
  if (now.collectionTitle === null) return SCREEN_READER_ANNOUNCEMENTS.movedToFree(now.poem.title, position, now.total);
  return SCREEN_READER_ANNOUNCEMENTS.movedToCollection(now.poem.title, now.collectionTitle, position, now.total);
}

function describeCollectionStepForScreenReader(event: ScreenReaderAnnouncementEvent, after: Arrangement): string {
  const index = after.collections.findIndex((collection) => collection.id === event.item.id);
  const collection = after.collections[index];
  if (collection === undefined) return "";
  if (event.kind === "picked") return SCREEN_READER_ANNOUNCEMENTS.picked(collection.title);
  if (event.kind === "cancelled") return SCREEN_READER_ANNOUNCEMENTS.cancelled(collection.title);
  return SCREEN_READER_ANNOUNCEMENTS.position(collection.title, index + 1, after.collections.length);
}

/**
 * The text for the board's live region (FR-7): `before` is the arrangement of the previous step and `after` the
 * current one. An empty string when the item is on neither, so nothing is announced for a stale event.
 */
export function screenReaderAnnouncementFor(event: ScreenReaderAnnouncementEvent, before: Arrangement, after: Arrangement): string {
  return event.item.type === "poem" ? describePoemStepForScreenReader(event, before, after) : describeCollectionStepForScreenReader(event, after);
}
