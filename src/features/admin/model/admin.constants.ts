/** Rows on one `/admin` page (design D9). */
export const ADMIN_USERS_PAGE_SIZE = 10;

/** The URL parameters of the user list: the keyset cursor and the exact-email filter (design D9). */
export const ADMIN_LIST_PARAM = {
  after: "after",
  email: "email",
} as const;

/** The state a user's row shows; admins are not listed, so there is no admin state (design D3, D15, FR-3). */
export const USER_STATE = {
  active: "active",
  blocked: "blocked",
  banned: "banned",
} as const;

/** The restriction kinds stored in `account_restrictions` (design D3). */
export const RESTRICTION_KIND = {
  blocked: "blocked",
  banned: "banned",
} as const;

/** What the block, unblock, ban and revoke functions answer (design D2, FR-4 to FR-7). */
export const MODERATION_DB_STATUS = {
  blocked: "blocked",
  unblocked: "unblocked",
  banned: "banned",
  revoked: "revoked",
  noSessions: "no-sessions",
  alreadyRestricted: "already-restricted",
  notBlocked: "not-blocked",
  targetIsAdmin: "target-is-admin",
  notFound: "not-found",
} as const;

/** What the two delete functions answer (design D7, FR-8, FR-9). */
export const DELETE_DB_STATUS = {
  deleted: "deleted",
  notFound: "not-found",
} as const;

/** The operation names the moderation DAL logs and reports failures under, one per function. */
export const MODERATION_OPERATION = {
  block: "block user",
  unblock: "unblock user",
  ban: "ban user",
  revoke: "revoke sessions",
} as const;

/** The operation names the delete DAL logs and reports failures under. */
export const DELETE_OPERATION = {
  poem: "delete poem",
  collection: "delete collection",
} as const;
