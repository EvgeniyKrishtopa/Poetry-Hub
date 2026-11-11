import "server-only";

import { refresh } from "next/cache";

import { consumeMoveAllowance } from "../dal/move-allowance";
import { MOVE_DB_STATUS, MOVE_FAILURE_REASON } from "../model/work-ordering.constants";
import type { MoveResult, MoveWriteResult, ServiceFailure } from "../model/work-ordering.types";

import { expireAuthorWorksTag } from "./expire-author-works-tag";
import { checkSession } from "./session-check";

// The steps both move actions share (design D6), in order, each failure stopping the rest: ids guard, session, limit,
// move. The owner is resolved from the session by the database, never from input (NFR-1). Nothing is counted before
// the limit step, and every attempt counts from there on (NFR-2). `moved` expires the author's public tag and
// refreshes the client router; `stale` and `not-found` refresh only, so the board shows the stored lists (FR-11);
// a rate-limited or failed move changed nothing, so it expires and refreshes nothing (FR-8).

const FAILED: MoveResult = { ok: false, reason: MOVE_FAILURE_REASON.failed };
const UNAUTHENTICATED: MoveResult = { ok: false, reason: MOVE_FAILURE_REASON.unauthenticated };

/** A classified failure in the board's terms: a gone session sends the author to sign in, the rest is `failed`. */
function reasonOf(failure: ServiceFailure): MoveResult {
  return failure === "unauthenticated" ? UNAUTHENTICATED : FAILED;
}

/** What the answered move means for the caches and for the board. */
function settle(answer: MoveWriteResult): MoveResult {
  if (!answer.ok) return reasonOf(answer.failure);

  // The tag first, so the refreshed render already reads the new order.
  if (answer.status === MOVE_DB_STATUS.moved) expireAuthorWorksTag(answer.authorId);
  refresh();
  return answer.status === MOVE_DB_STATUS.moved ? { ok: true } : { ok: false, reason: MOVE_FAILURE_REASON.stale };
}

/**
 * Runs one move through the shared steps. `idsAreValid` is the ids guard of the action's own input; `write` is the
 * action's own database call.
 */
export async function runMove(idsAreValid: boolean, write: () => Promise<MoveWriteResult>): Promise<MoveResult> {
  if (!idsAreValid) {
    // The board only sends ids it was given by the server, so this points at a client bug. No ids in the line (NFR-7).
    console.error("[work-ordering] move input rejected");
    return FAILED;
  }

  const session = await checkSession();
  if (!session.ok) return reasonOf(session.failure);

  const allowance = await consumeMoveAllowance();
  if (!allowance.ok) {
    return allowance.failure === "too-many-moves"
      ? { ok: false, reason: MOVE_FAILURE_REASON.rateLimited }
      : reasonOf(allowance.failure);
  }

  return settle(await write());
}
