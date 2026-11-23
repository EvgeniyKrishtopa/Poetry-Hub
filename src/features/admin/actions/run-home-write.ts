import "server-only";

import { refresh, updateTag } from "next/cache";

import { HOME_FEATURED_TAG } from "@/shared/config/cache-tags";

import { addHomeAuthor, addHomePoem, moveHomeEntry, removeHomeEntry } from "../dal/home-rpc";
import { toFailureReason } from "../model/action-results";
import { HOME_DB_STATUS, HOME_ENTRY_OPERATION } from "../model/home-entry.constants";
import type {
  AddHomeAuthorInput,
  AddHomePoemInput,
  HomeActionResult,
  HomeAddStatus,
  HomeMoveStatus,
  HomeRemoveStatus,
  HomeWriteResult,
  MoveHomeEntryInput,
  RemoveHomeEntryInput,
} from "../model/home-entry.types";

import { checkSession } from "./session-check";

/**
 * What an answer does to the caches: `expire` drops the home page's tag and refreshes the router (the list changed),
 * `refresh` only refreshes so `/admin/home` shows the real list (nothing was written), `none` leaves everything alone.
 */
type HomeCacheEffect = "expire" | "refresh" | "none";

const HOME_ADD_EFFECTS: Readonly<Record<HomeAddStatus, HomeCacheEffect>> = {
  [HOME_DB_STATUS.added]: "expire",
  [HOME_DB_STATUS.limitReached]: "none",
  [HOME_DB_STATUS.alreadyInList]: "none",
  [HOME_DB_STATUS.notFound]: "none",
};

const HOME_MOVE_EFFECTS: Readonly<Record<HomeMoveStatus, HomeCacheEffect>> = {
  [HOME_DB_STATUS.moved]: "expire",
  [HOME_DB_STATUS.stale]: "refresh",
  [HOME_DB_STATUS.notFound]: "refresh",
};

const HOME_REMOVE_EFFECTS: Readonly<Record<HomeRemoveStatus, HomeCacheEffect>> = {
  [HOME_DB_STATUS.removed]: "expire",
  [HOME_DB_STATUS.notFound]: "refresh",
};

// Both calls work only while a Server Action runs. The tag goes first so the refresh already reads the new list.
function applyCacheEffect(effect: HomeCacheEffect): void {
  if (effect === "expire") {
    updateTag(HOME_FEATURED_TAG);
    refresh();
    return;
  }
  if (effect === "refresh") refresh();
}

/** Which write to run and the validated input it takes; the operation decides the database function and the cache effects. */
export type HomeWrite =
  | { readonly operation: typeof HOME_ENTRY_OPERATION.addPoem; readonly input: AddHomePoemInput }
  | { readonly operation: typeof HOME_ENTRY_OPERATION.addAuthor; readonly input: AddHomeAuthorInput }
  | { readonly operation: typeof HOME_ENTRY_OPERATION.move; readonly input: MoveHomeEntryInput }
  | { readonly operation: typeof HOME_ENTRY_OPERATION.remove; readonly input: RemoveHomeEntryInput };

type HomeAddWrite = Extract<HomeWrite, { operation: "add home poem" | "add home author" }>;
type HomeMoveWrite = Extract<HomeWrite, { operation: "move home entry" }>;
type HomeRemoveWrite = Extract<HomeWrite, { operation: "remove home entry" }>;

/**
 * The steps the four home actions share, each failure stopping the rest: the input is already validated by the
 * action's schema, then the session is read again, then the operation's one function runs, then the caches follow the
 * answer. A failed write touches no cache (FR-13). The admin right is the database's to check, so nothing here decides
 * it. An answer from the database leaves one log line with the operation and the status only, so an admin's change to
 * the public home page has a trace (NFR-6: no id, no title).
 */
export async function runHomeWrite(write: HomeAddWrite): Promise<HomeActionResult<HomeAddStatus>>;
export async function runHomeWrite(write: HomeMoveWrite): Promise<HomeActionResult<HomeMoveStatus>>;
export async function runHomeWrite(write: HomeRemoveWrite): Promise<HomeActionResult<HomeRemoveStatus>>;
export async function runHomeWrite(write: HomeWrite): Promise<HomeActionResult<string>> {
  const session = await checkSession();
  if (!session.ok) return { ok: false, reason: session.failure };

  switch (write.operation) {
    case HOME_ENTRY_OPERATION.addPoem: {
      const answer = await addHomePoem(write.input);
      return finishHomeWrite(write.operation, answer, HOME_ADD_EFFECTS);
    }
    case HOME_ENTRY_OPERATION.addAuthor: {
      const answer = await addHomeAuthor(write.input);
      return finishHomeWrite(write.operation, answer, HOME_ADD_EFFECTS);
    }
    case HOME_ENTRY_OPERATION.move: {
      const answer = await moveHomeEntry(write.input);
      return finishHomeWrite(write.operation, answer, HOME_MOVE_EFFECTS);
    }
    case HOME_ENTRY_OPERATION.remove: {
      const answer = await removeHomeEntry(write.input);
      return finishHomeWrite(write.operation, answer, HOME_REMOVE_EFFECTS);
    }
  }
}

function finishHomeWrite<Status extends string>(
  operation: string,
  write: HomeWriteResult<Status>,
  effects: Readonly<Record<Status, HomeCacheEffect>>,
): HomeActionResult<Status> {
  if (!write.ok) return { ok: false, reason: toFailureReason(write.failure) };

  console.info(`[admin] ${operation}: ${write.status}`);
  applyCacheEffect(effects[write.status]);
  return { ok: true, status: write.status };
}
