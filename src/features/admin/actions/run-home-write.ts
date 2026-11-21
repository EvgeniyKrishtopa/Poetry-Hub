import "server-only";

import { refresh, updateTag } from "next/cache";

import { HOME_FEATURED_TAG } from "@/shared/config/cache-tags";

import { toFailureReason } from "../model/action-results";
import { HOME_DB_STATUS } from "../model/home-entry.constants";
import type {
  HomeActionResult,
  HomeAddStatus,
  HomeMoveStatus,
  HomeRemoveStatus,
  HomeWriteResult,
} from "../model/home-entry.types";

import { checkSession } from "./session-check";

/**
 * What an answer does to the caches: `expire` drops the home page's tag and refreshes the router (the list changed),
 * `refresh` only refreshes so `/admin/home` shows the real list (nothing was written), `none` leaves everything alone.
 */
export type HomeCacheEffect = "expire" | "refresh" | "none";

export const HOME_ADD_EFFECTS: Readonly<Record<HomeAddStatus, HomeCacheEffect>> = {
  [HOME_DB_STATUS.added]: "expire",
  [HOME_DB_STATUS.limitReached]: "none",
  [HOME_DB_STATUS.alreadyInList]: "none",
  [HOME_DB_STATUS.notFound]: "none",
};

export const HOME_MOVE_EFFECTS: Readonly<Record<HomeMoveStatus, HomeCacheEffect>> = {
  [HOME_DB_STATUS.moved]: "expire",
  [HOME_DB_STATUS.stale]: "refresh",
  [HOME_DB_STATUS.notFound]: "refresh",
};

export const HOME_REMOVE_EFFECTS: Readonly<Record<HomeRemoveStatus, HomeCacheEffect>> = {
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

/**
 * The steps the four home actions share, each failure stopping the rest: the input is already validated by the
 * action's schema, then the session is read again, then the one function runs, then the caches follow the answer. A
 * failed write touches no cache (FR-13). The admin right is the database's to check, so nothing here decides it. An
 * answer from the database leaves one log line with the operation and the status only, so an admin's change to the
 * public home page has a trace (NFR-6: no id, no title).
 */
export async function runHomeWrite<Status extends string>(
  operation: string,
  call: () => Promise<HomeWriteResult<Status>>,
  effects: Readonly<Record<Status, HomeCacheEffect>>,
): Promise<HomeActionResult<Status>> {
  const session = await checkSession();
  if (!session.ok) return { ok: false, reason: session.failure };

  const write = await call();
  if (!write.ok) return { ok: false, reason: toFailureReason(write.failure) };

  console.info(`[admin] ${operation}: ${write.status}`);
  applyCacheEffect(effects[write.status]);
  return { ok: true, status: write.status };
}
