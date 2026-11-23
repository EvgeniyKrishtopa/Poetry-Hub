import { ADMIN_HOME_PAGE_COPY } from "./admin-messages";
import type { HomeEntry } from "./home-entry.types";

function positionOf(entries: readonly HomeEntry[], id: string | number | null | undefined): number | null {
  const index = entries.findIndex((entry) => entry.id === id);
  return index === -1 ? null : index + 1;
}

/** What the library's live region reads when a handle is lifted: the entry, its place and the keys. */
export function announcePicked(entries: readonly HomeEntry[], id: string | number): string | undefined {
  const entry = entries.find((candidate) => candidate.id === id);
  const position = positionOf(entries, id);
  if (entry === undefined || position === null) return undefined;
  return ADMIN_HOME_PAGE_COPY.picked(entry.label, position, entries.length);
}

/**
 * What it reads while the held entry passes over another place. The library reports the held entry's own place the
 * moment it is lifted, which would replace the lifting text before it is read, so that place stays silent.
 */
export function announceMoved(
  entries: readonly HomeEntry[],
  activeId: string | number,
  overId: string | number | null | undefined,
): string | undefined {
  if (overId === activeId) return undefined;
  const position = positionOf(entries, overId);
  if (position === null) return undefined;
  return ADMIN_HOME_PAGE_COPY.moved(position, entries.length);
}

/** What it reads when the entry is dropped; no place under it reads as a cancel. */
export function announceDropped(entries: readonly HomeEntry[], overId: string | number | null | undefined): string {
  const position = positionOf(entries, overId);
  if (position === null) return ADMIN_HOME_PAGE_COPY.cancelled;
  return ADMIN_HOME_PAGE_COPY.dropped(position, entries.length);
}
