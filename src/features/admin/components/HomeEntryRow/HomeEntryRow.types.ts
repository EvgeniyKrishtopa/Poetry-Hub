import type { HomeEntry } from "../../model/home-entry.types";

export interface HomeEntryRowProps {
  readonly entry: HomeEntry;
  /** True while a call is out or the connection is not normal. */
  readonly controlsDisabled: boolean;
  readonly onRemove: (entry: HomeEntry) => void;
}
