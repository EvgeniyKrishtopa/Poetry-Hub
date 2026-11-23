import { ADD_TO_HOME_COPY, ADMIN_HOME_PAGE_COPY } from "./admin-messages";
import { HOME_DB_STATUS } from "./home-entry.constants";
import type {
  HomeActionResult,
  HomeAddStatus,
  HomeEntryKind,
  HomeFailureReason,
  HomeMoveStatus,
  HomeRemoveStatus,
} from "./home-entry.types";
import type { AdminNotice } from "./violation.types";

function failureText(reason: HomeFailureReason): string {
  if (reason === "forbidden") return ADD_TO_HOME_COPY.forbidden;
  if (reason === "unauthenticated") return ADD_TO_HOME_COPY.unauthenticated;
  return ADD_TO_HOME_COPY.failed;
}

/** The status a call that reached the database answered, worded for the poem or the author control. */
function statusNotice(status: HomeAddStatus, kind: HomeEntryKind): AdminNotice {
  switch (status) {
    case HOME_DB_STATUS.added:
      return { tone: "success", text: ADD_TO_HOME_COPY.added };
    case HOME_DB_STATUS.alreadyInList:
      return { tone: "neutral", text: ADD_TO_HOME_COPY.alreadyInList };
    case HOME_DB_STATUS.limitReached:
      return { tone: "neutral", text: ADD_TO_HOME_COPY.limitReached[kind] };
    case HOME_DB_STATUS.notFound:
      return { tone: "danger", text: ADD_TO_HOME_COPY.notFound[kind] };
  }
}

/** The line above the control after an add: a result, a refusal of the database, or a failed call (FR-8). */
export function describeAddToHomeResult(result: HomeActionResult<HomeAddStatus>, kind: HomeEntryKind): AdminNotice {
  if (!result.ok) return { tone: "danger", text: failureText(result.reason) };
  return statusNotice(result.status, kind);
}

/** The line above a list after a move or a remove: nothing on a change that was stored, else what went wrong (FR-9). */
export function describeHomeListResult(result: HomeActionResult<HomeMoveStatus | HomeRemoveStatus>): AdminNotice | null {
  if (!result.ok) {
    if (result.reason === "forbidden") return { tone: "danger", text: ADD_TO_HOME_COPY.forbidden };
    if (result.reason === "unauthenticated") return { tone: "danger", text: ADD_TO_HOME_COPY.unauthenticated };
    return { tone: "danger", text: ADMIN_HOME_PAGE_COPY.moveFailed };
  }
  if (result.status === HOME_DB_STATUS.stale || result.status === HOME_DB_STATUS.notFound) {
    return { tone: "neutral", text: ADMIN_HOME_PAGE_COPY.stale };
  }
  return null;
}
