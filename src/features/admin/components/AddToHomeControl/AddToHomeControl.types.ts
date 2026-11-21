import type { HomeEntryKind } from "../../model/home-entry.types";

export interface AddToHomeControlProps {
  /** A poem id, or an author's profile id, matching `kind`. */
  readonly id: string;
  readonly kind: HomeEntryKind;
}
