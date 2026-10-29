import type { SupabaseFailure } from "@/shared/lib/supabase/classify-error";

import type { ACTION_STATUS, FIELD_ACTION, FIELD_MODE, FORM_STATUS, WRITE_SCOPES } from "./author.constants";

export type NameField = "first_name" | "last_name";

/** The four editor fields; each is saved and deleted on its own. */
export type ProfileField = NameField | "about" | "photo";

/** Why a profile read or write failed, in the terms the editor shows (FR-9). */
export type ProfileFailure = SupabaseFailure;

/** Why a profile write failed: a read's failures, or the per-user write limit (FR-21). Reads stay narrow. */
export type WriteFailure = ProfileFailure | "too-many-saves" | "too-many-uploads";

/** Which per-user write limit an action counts against (FR-21). */
export type WriteScope = (typeof WRITE_SCOPES)[keyof typeof WRITE_SCOPES];

/** Whether the write limit lets this attempt through; when not, why (design D13). */
export type WriteAllowance = { readonly ok: true } | { readonly ok: false; readonly failure: WriteFailure };

/** The owner's own profile; any field may be empty. */
export interface AuthorProfile {
  readonly id: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly about: string | null;
  readonly photoUrl: string | null;
}

/** A public profile: both names are set. Never carries the auth user id. */
export interface PublicAuthor {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly about: string | null;
  readonly photoUrl: string | null;
}

/** Content columns a field write may set; never id, user_id, or created_at. */
export type ProfileRowPatch = Readonly<
  Partial<{
    first_name: string | null;
    last_name: string | null;
    about: string | null;
  }>
>;

/** `profile: null` means no profile, including a row with no content. */
export type MyProfileResult =
  | { readonly ok: true; readonly profile: AuthorProfile | null }
  | { readonly ok: false; readonly failure: ProfileFailure };

export type ProfileWriteResult = MyProfileResult;

export type PublicAuthorResult =
  | { readonly ok: true; readonly author: PublicAuthor }
  | { readonly ok: false; readonly reason: "not-found" | "unavailable" };

/** A public author's display name, for the breadcrumb trail; the failures are `PublicAuthorResult`'s. */
export type PublicAuthorNameResult =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly reason: "not-found" | "unavailable" };

export type PublicAuthorsResult =
  | { readonly ok: true; readonly authors: readonly PublicAuthor[] }
  | { readonly ok: false; readonly reason: "unavailable" };

/** What every profile action returns as its data. */
export type ProfileActionResult =
  | { readonly status: typeof ACTION_STATUS.saved; readonly profile: AuthorProfile | null }
  | { readonly status: typeof ACTION_STATUS.failed; readonly failure: WriteFailure };

/** Whether the session may write its own profile; when not, the action's result says why. */
export type WriteAccess =
  | { readonly ok: true }
  | { readonly ok: false; readonly result: Extract<ProfileActionResult, { status: typeof ACTION_STATUS.failed }> };

/**
 * The part of a next-safe-action result the editor reads, with the client's "flattened"
 * validation-error shape. Declared here so `model/` stays free of the library.
 */
export interface ProfileActionResponse {
  readonly data?: ProfileActionResult;
  readonly serverError?: string;
  readonly validationErrors?: {
    readonly formErrors: readonly string[];
    readonly fieldErrors: Readonly<Record<string, readonly string[] | undefined>>;
  };
}

/** One field's form state; a failure keeps the submitted draft (FR-7). */
export type FieldFormState<Draft> =
  | { readonly status: typeof FORM_STATUS.idle }
  | { readonly status: typeof FORM_STATUS.saved }
  | { readonly status: typeof FORM_STATUS.invalid; readonly draft: Draft; readonly error: string }
  | { readonly status: typeof FORM_STATUS.failed; readonly draft: Draft; readonly failure: WriteFailure };

export type FieldActionKind = (typeof FIELD_ACTION)[keyof typeof FIELD_ACTION];

export type FieldMode = (typeof FIELD_MODE)[keyof typeof FIELD_MODE];

/**
 * The signed-in owner's profile reduced to "public or not" (add-poem-creation design D4).
 */
export type OwnPublicAuthorResult =
  | { readonly ok: true; readonly status: "public"; readonly authorId: string }
  | { readonly ok: true; readonly status: "not-public" }
  | { readonly ok: false; readonly failure: ProfileFailure };
