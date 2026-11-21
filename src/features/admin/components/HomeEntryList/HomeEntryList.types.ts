import type { HomeEntry, HomeEntryKind } from "../../model/home-entry.types";

export interface HomeEntryListProps {
  readonly kind: HomeEntryKind;
  /** The list's entries in position order, as read on the server. */
  readonly entries: readonly HomeEntry[];
}
