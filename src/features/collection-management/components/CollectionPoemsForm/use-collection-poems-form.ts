import type { RefObject } from "react";

import type {
  CollectionPoemChoice,
  SaveCollectionPoemsFailure,
  SaveCollectionPoemsOutcome,
} from "../../model/collection-management.types";

/** The page's failure alert: the save failures that stay on the page, plus the stale selection (add-poems-to-collections D6). */
export type CollectionPoemsAlert = Exclude<SaveCollectionPoemsFailure, "unauthenticated"> | "stale";

export interface CollectionPoemsFormOptions {
  readonly collectionId: string;
  readonly choices: readonly CollectionPoemChoice[];
}

export interface CollectionPoemsFormModel {
  /** `draft ?? stored`: the boxes shown checked. */
  readonly checked: ReadonlySet<string>;
  readonly isChanged: boolean;
  readonly isPending: boolean;
  /** A save succeeded since the page opened and nothing changed after it. */
  readonly justSaved: boolean;
  readonly alert: CollectionPoemsAlert | null;
  readonly alertRef: RefObject<HTMLDivElement | null>;
  readonly toggle: (poemId: string) => void;
  /** Runs the save; resolves with its result once the client has handled it, so the leave dialog can continue. */
  readonly save: () => Promise<SaveCollectionPoemsOutcome>;
}

/**
 * The selection (`draft: Set | null`, null following the stored set), the save call and its outcomes, reset inside
 * the action's transition (add-poems-to-collections D5, D6).
 */
export function useCollectionPoemsForm(options: CollectionPoemsFormOptions): CollectionPoemsFormModel {
  void options;
  throw new Error("not implemented");
}
