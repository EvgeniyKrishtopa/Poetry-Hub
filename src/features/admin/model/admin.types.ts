import type { SupabaseFailure } from "@/shared/lib/supabase/classify-error";

import type { DELETE_DB_STATUS, MODERATION_DB_STATUS, RESTRICTION_KIND, USER_STATE } from "./admin.constants";

export type UserState = (typeof USER_STATE)[keyof typeof USER_STATE];
export type RestrictionKind = (typeof RESTRICTION_KIND)[keyof typeof RESTRICTION_KIND];
export type ModerationDbStatus = (typeof MODERATION_DB_STATUS)[keyof typeof MODERATION_DB_STATUS];

/** Why a database call failed: Supabase's own kinds, plus a refused admin check (SQLSTATE 42501, design D2). */
export type AdminFailure = SupabaseFailure | "forbidden";

/** One row of the user list, only the columns the page shows (FR-3). The state is derived from these, never stored. */
export interface AdminUser {
  readonly id: string;
  readonly email: string;
  readonly authorName: string | null;
  readonly createdAt: string;
  readonly lastSignInAt: string | null;
  readonly restriction: RestrictionKind | null;
  readonly isAdmin: boolean;
}

/** The admin check's answer; an unreadable check is a failure, never "not an admin" (FR-2). */
export type AdminCheckResult =
  { readonly ok: true; readonly isAdmin: boolean } | { readonly ok: false; readonly failure: AdminFailure };

/** `may_moderate_author`'s answer: true only for an admin who is not the author; not the same as "is an admin" (FR-10). */
export type ModerateCheckResult =
  { readonly ok: true; readonly mayModerate: boolean } | { readonly ok: false; readonly failure: AdminFailure };

/** One page of users; `nextCursor` is null on the last page (design D9). */
export type UserListResult =
  | {
      readonly ok: true;
      readonly users: readonly AdminUser[];
      readonly nextCursor: string | null;
    }
  | { readonly ok: false; readonly failure: AdminFailure };

/** A moderation function's answer, or why it could not be asked. */
export type ModerationWriteResult =
  { readonly ok: true; readonly status: ModerationDbStatus } | { readonly ok: false; readonly failure: AdminFailure };

/** A poem delete's answer; only `deleted` carries what the app needs afterwards (design D8). */
export type PoemDeleteWriteResult =
  | {
      readonly ok: true;
      readonly status: typeof DELETE_DB_STATUS.deleted;
      readonly authorId: string;
      readonly illustrationPath: string | null;
    }
  | { readonly ok: true; readonly status: typeof DELETE_DB_STATUS.notFound }
  | { readonly ok: false; readonly failure: AdminFailure };

/** A collection delete's answer. */
export type CollectionDeleteWriteResult =
  | {
      readonly ok: true;
      readonly status: typeof DELETE_DB_STATUS.deleted;
      readonly authorId: string;
      readonly title: string;
    }
  | { readonly ok: true; readonly status: typeof DELETE_DB_STATUS.notFound }
  | { readonly ok: false; readonly failure: AdminFailure };

/** Whether the session may act, and why not when it may not. */
export type SessionCheck =
  { readonly ok: true } | { readonly ok: false; readonly failure: "unauthenticated" | "unavailable" };

/** Why a moderation action did not change the account, in the terms the row shows (FR-4 to FR-7, FR-12). */
export type ModerationFailureReason =
  | "already-restricted"
  | "not-blocked"
  | "target-is-admin"
  | "not-found"
  | "forbidden"
  | "unauthenticated"
  | "unavailable"
  | "invalid";

/** What a moderation Server Action returns; `status` is the success the row shows. */
export type ModerationActionResult =
  | {
      readonly ok: true;
      readonly status: "blocked" | "unblocked" | "banned" | "revoked" | "no-sessions";
    }
  | { readonly ok: false; readonly reason: ModerationFailureReason };

/** Why a delete did not happen (FR-8, FR-9, FR-12); `not-found` is the "already gone" answer. */
export type DeleteFailureReason = "not-found" | "forbidden" | "unauthenticated" | "unavailable" | "invalid";

/** What a delete Server Action returns; the control sends the admin to the redirect it was given on success. */
export type DeleteActionResult = { readonly ok: true } | { readonly ok: false; readonly reason: DeleteFailureReason };
