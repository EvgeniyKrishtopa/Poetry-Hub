import "server-only";

import type {
  AddHomeAuthorInput,
  AddHomePoemInput,
  HomeAddStatus,
  HomeEntriesResult,
  HomeMoveStatus,
  HomeRemoveStatus,
  HomeWriteResult,
  MoveHomeEntryInput,
  RemoveHomeEntryInput,
} from "../model/home-entry.types";

// Every call runs with the cookie client as the signed-in admin; the database checks the admin right itself and a
// caller who is not one fails with 42501, which is `forbidden`. Each answer is parsed against the function's own
// contract; a failure is a value, and a log line holds the operation and the failure kind only (NFR-6).

/** Calls `admin_add_home_poem`. */
export async function addHomePoem(input: AddHomePoemInput): Promise<HomeWriteResult<HomeAddStatus>> {
  void input;
  throw new Error("not implemented");
}

/** Calls `admin_add_home_author`. */
export async function addHomeAuthor(input: AddHomeAuthorInput): Promise<HomeWriteResult<HomeAddStatus>> {
  void input;
  throw new Error("not implemented");
}

/** Calls `admin_move_home_entry`. */
export async function moveHomeEntry(input: MoveHomeEntryInput): Promise<HomeWriteResult<HomeMoveStatus>> {
  void input;
  throw new Error("not implemented");
}

/** Calls `admin_remove_home_entry`. */
export async function removeHomeEntry(input: RemoveHomeEntryInput): Promise<HomeWriteResult<HomeRemoveStatus>> {
  void input;
  throw new Error("not implemented");
}

/** Calls `admin_list_home_entries`. */
export async function listHomeEntries(): Promise<HomeEntriesResult> {
  throw new Error("not implemented");
}
