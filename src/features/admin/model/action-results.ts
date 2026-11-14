import { MODERATION_DB_STATUS } from "./admin.constants";
import type {
  AdminFailure,
  ModerationActionResult,
  ModerationFailureReason,
  ModerationWriteResult,
} from "./admin.types";

/**
 * How a failed call reads on the page. `unknown` (a grant or policy bug, or an answer that is not in the contract)
 * shows the outage text, the same one an unexpected throw gets from the action client: either way the admin can't
 * tell more than "not now", and nothing changed.
 */
export function toFailureReason(failure: AdminFailure): "forbidden" | "unauthenticated" | "unavailable" {
  if (failure === "forbidden" || failure === "unauthenticated") return failure;
  return "unavailable";
}

/** A moderation function's answer in the terms the row shows (FR-4 to FR-7, FR-12). */
export function toModerationActionResult(write: ModerationWriteResult): ModerationActionResult {
  if (!write.ok) return { ok: false, reason: toFailureReason(write.failure) };

  switch (write.status) {
    case MODERATION_DB_STATUS.blocked:
      return { ok: true, status: "blocked" };
    case MODERATION_DB_STATUS.unblocked:
      return { ok: true, status: "unblocked" };
    case MODERATION_DB_STATUS.banned:
      return { ok: true, status: "banned" };
    case MODERATION_DB_STATUS.revoked:
      return { ok: true, status: "revoked" };
    case MODERATION_DB_STATUS.noSessions:
      return { ok: true, status: "no-sessions" };
    case MODERATION_DB_STATUS.alreadyRestricted:
      return failedModeration("already-restricted");
    case MODERATION_DB_STATUS.notBlocked:
      return failedModeration("not-blocked");
    case MODERATION_DB_STATUS.targetIsAdmin:
      return failedModeration("target-is-admin");
    case MODERATION_DB_STATUS.notFound:
      return failedModeration("not-found");
  }
}

function failedModeration(reason: ModerationFailureReason): ModerationActionResult {
  return { ok: false, reason };
}
