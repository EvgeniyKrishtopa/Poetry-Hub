import type { AdminFailure } from "./admin.types";

/** Which of the two lists an entry belongs to; an entry never moves between them (FR-9). */
export type HomeEntryKind = "poem" | "author";

/** One chosen poem or author as `admin_list_home_entries` returns it (design D2). */
export interface HomeEntry {
  readonly kind: HomeEntryKind;
  readonly id: string;
  /** 1 to `HOME_ENTRY_LIMIT`. */
  readonly position: number;
  /** False when the author is no longer public: the home page skips the entry but the admin still sees it (FR-11). */
  readonly shown: boolean;
  /** The poem's title, or the author's name. */
  readonly label: string;
  /** The poem's author's name; `null` for an author entry. */
  readonly authorName: string | null;
}

export interface AddHomePoemInput {
  readonly poemId: string;
}

export interface AddHomeAuthorInput {
  /** The author's profile id, the id the public pages know. */
  readonly authorProfileId: string;
}

export interface MoveHomeEntryInput {
  readonly kind: HomeEntryKind;
  readonly id: string;
  /** Where the browser saw the entry; a different stored position is `stale` (design D2). */
  readonly fromPosition: number;
  readonly toPosition: number;
}

export interface RemoveHomeEntryInput {
  readonly kind: HomeEntryKind;
  readonly id: string;
}

export type HomeAddStatus = "added" | "limit-reached" | "already-in-list" | "not-found";

export type HomeMoveStatus = "moved" | "stale" | "not-found";

export type HomeRemoveStatus = "removed" | "not-found";

/** A write's answer: the database's status, or why the call failed. A failure is a value, never a throw. */
export type HomeWriteResult<Status extends string> =
  | { readonly ok: true; readonly status: Status }
  | { readonly ok: false; readonly failure: AdminFailure };

/** Why an action did not change anything beyond the database's own statuses: a refused input or a failed call. */
export type HomeFailureReason = AdminFailure | "invalid";

/** What an action returns to the client: the database's status, or the reason it stopped (never a throw). */
export type HomeActionResult<Status extends string> =
  | { readonly ok: true; readonly status: Status }
  | { readonly ok: false; readonly reason: HomeFailureReason };

/** Both lists in position order, or why they could not be read (FR-9). */
export type HomeEntriesResult =
  | { readonly ok: true; readonly poems: readonly HomeEntry[]; readonly authors: readonly HomeEntry[] }
  | { readonly ok: false; readonly failure: AdminFailure };
