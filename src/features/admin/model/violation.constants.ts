/** The closed list of grounds a case can have; comments will extend it later. */
export const VIOLATION_GROUND = {
  harmfulContent: "harmful-content",
  maliciousActivity: "malicious-activity",
} as const;

/** What can prompt a case: a poem or a collection of the user. */
export const VIOLATION_CONTENT_KIND = {
  poem: "poem",
  collection: "collection",
} as const;

/** A case's derived status; never stored (design D2). */
export const CASE_STATUS = {
  waiting: "waiting",
  warned: "warned",
  deadlinePassed: "deadline-passed",
} as const;

const MS_PER_HOUR = 3_600_000;

/** How long a warned user has to react, as a reminder only: nothing enforces it (design D6). */
export const WARNING_PERIOD_HOURS = 24;
export const WARNING_PERIOD_MS = WARNING_PERIOD_HOURS * MS_PER_HOUR;

/** The longest message an admin can add to a warning, in code points after trimming. */
export const WARNING_MESSAGE_MAX_LENGTH = 2000;

/** Cases `admin_list_violation_cases` returns at most; the page says when the cap is hit (design D3). */
export const VIOLATION_LIST_LIMIT = 100;

/** What the new violation functions answer (design D3). */
export const VIOLATION_DB_STATUS = {
  added: "added",
  alreadyInList: "already-in-list",
  targetIsAdmin: "target-is-admin",
  alreadyRestricted: "already-restricted",
  notFound: "not-found",
  contentNotFound: "content-not-found",
  groundChanged: "ground-changed",
  removed: "removed",
  ready: "ready",
  wrongGround: "wrong-ground",
  alreadyWarned: "already-warned",
  noAddress: "no-address",
  warned: "warned",
} as const;

/** The restricting actions that email the affected user (design D5). */
export const ACTION_NOTICE_KIND = {
  block: "block",
  ban: "ban",
  deletePoem: "delete-poem",
  deleteCollection: "delete-collection",
} as const;

/** What `admin_log_notice` records, without any address or text (design D3). */
export const NOTICE_LOG_OUTCOME = {
  sent: "sent",
  failed: "failed",
} as const;
