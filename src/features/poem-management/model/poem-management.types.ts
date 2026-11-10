import type { Poem } from "@/features/poems";
import type { ImageType } from "@/shared/lib/image-file/image-file.types";

import type {
  CREATE_POEM_STATUS,
  DELETE_POEM_STATUS,
  ILLUSTRATION_CHANGE,
  UPDATE_POEM_STATUS,
} from "./poem-management.constants";

/** The add form's fields, as named in the submitted `FormData`. */
export type PoemFormField = "title" | "text" | "genreId" | "illustration";

/** One message per field. */
export type PoemFieldErrors = Readonly<Partial<Record<PoemFormField, string>>>;

/** The illustration field's button texts, chosen by each form (edit-poem design D6). */
export interface IllustrationLabels {
  /** The picker's text while no preview shows. */
  readonly choose: string;
  /** The picker's text while the stored or a newly picked illustration shows. */
  readonly replace: string;
  readonly remove: string;
}

/** A service read or write that failed, classified like the profile editor's failures. */
export type ServiceFailure = "unauthenticated" | "unavailable" | "unknown";

export type CreatePoemFailure = ServiceFailure | "too-many-poems";

/**
 * The create action's answer: success is explicit, never "no error" (design D7). Every field error the
 * server finds, from the field rules or from the genre and illustration checks, arrives as `invalid` here,
 * never as next-safe-action's `validationErrors`, so the form reads this one shape.
 */
export type CreatePoemResult =
  | { readonly status: typeof CREATE_POEM_STATUS.created; readonly poemId: string }
  | { readonly status: typeof CREATE_POEM_STATUS.invalid; readonly fieldErrors: PoemFieldErrors }
  | { readonly status: typeof CREATE_POEM_STATUS.failed; readonly failure: CreatePoemFailure };

/** `can_create_poem()`'s status, or why it couldn't be read (design D2). */
export type CanCreatePoemResult =
  | { readonly ok: true; readonly status: "allowed" | "not-public" | "over-limit" }
  | { readonly ok: false; readonly failure: ServiceFailure };

/** A checked illustration with the type sniffed from its bytes. */
export interface PoemIllustration {
  readonly file: File;
  readonly type: ImageType;
}

/** What `createOwnPoem` stores: already trimmed and checked by the action. */
export interface CreateOwnPoemInput {
  readonly authorId: string;
  readonly title: string;
  readonly text: string;
  /** `null` for the no-genre option. */
  readonly genreId: string | null;
  readonly illustration: PoemIllustration | null;
}

export type CreateOwnPoemResult =
  | { readonly ok: true; readonly poemId: string }
  | { readonly ok: false; readonly failure: CreatePoemFailure };

/** The owner's poem by id (design D4). */
export type OwnPoemResult =
  | { readonly ok: true; readonly poem: Poem }
  | { readonly ok: false; readonly reason: "not-found" }
  | { readonly ok: false; readonly reason: "unavailable" };

/**
 * Which own poems are in a collection, as the route hands it to `/account/poems` (show-only-free-poems design D1).
 * Declared here so this feature never imports `collection-management`; its read's result fits this shape.
 */
export type CollectedPoemsRead =
  | { readonly ok: true; readonly poems: readonly { readonly id: string }[] }
  | { readonly ok: false };

/** The trail's last item for `/account/poems/<id>` (design D10). */
export type OwnPoemTitleResult =
  | { readonly ok: true; readonly title: string }
  | { readonly ok: false; readonly reason: "not-found" }
  | { readonly ok: false; readonly reason: "unavailable" };

/**
 * The delete action's answer (delete-poem design D3): another author's poem and a missing one are both
 * `not-found`, so the answer tells them apart for nobody.
 */
export type DeletePoemResult =
  | { readonly status: typeof DELETE_POEM_STATUS.deleted }
  | { readonly status: typeof DELETE_POEM_STATUS.notFound }
  | { readonly status: typeof DELETE_POEM_STATUS.failed; readonly failure: ServiceFailure };

/**
 * `delete_my_poem()`'s answer, or why it couldn't be read (delete-poem design D2, D3).
 */
export type DeleteOwnPoemResult =
  | {
      readonly ok: true;
      readonly status: "deleted";
      readonly authorId: string;
      readonly illustrationPath: string | null;
    }
  | { readonly ok: true; readonly status: "not-found" }
  | { readonly ok: false; readonly failure: ServiceFailure };

/** What `/account/poems` shows once after a delete (delete-poem design D5). */
export type DeletedPoemNotice = { readonly kind: "deleted"; readonly title: string } | { readonly kind: "already-deleted" };

/**
 * What a save does with the illustration (edit-poem design D3).
 *
 * @public scaffold: first imported in task 2.1.
 */
export type IllustrationChange = (typeof ILLUSTRATION_CHANGE)[keyof typeof ILLUSTRATION_CHANGE];

/** @public scaffold: first imported in task 2.4. */
export type UpdatePoemFailure = ServiceFailure | "too-many-saves" | "not-public";

/** A save failure shown in the edit form's alert; an expired session leaves for `/login` instead (design D7). */
export type SaveAlertFailure = Exclude<UpdatePoemFailure, "unauthenticated">;

/** Which success the owner's poem page announces once (edit-poem design D7). */
export interface PoemNotice {
  readonly poemId: string;
  readonly kind: "created" | "saved";
}

/**
 * The update action's answer (edit-poem design D3): success is explicit, never "no error".
 *
 * @public scaffold: first imported in task 2.4.
 */
export type UpdatePoemResult =
  | { readonly status: typeof UPDATE_POEM_STATUS.saved }
  | { readonly status: typeof UPDATE_POEM_STATUS.invalid; readonly fieldErrors: PoemFieldErrors }
  | { readonly status: typeof UPDATE_POEM_STATUS.notFound }
  | { readonly status: typeof UPDATE_POEM_STATUS.failed; readonly failure: UpdatePoemFailure };

/**
 * `consume_write_allowance('poem_edit')`'s answer, or why it couldn't be read (edit-poem design D3).
 *
 * @public scaffold: first imported in task 2.2.
 */
export type PoemEditAllowance =
  | { readonly ok: true }
  | { readonly ok: false; readonly failure: ServiceFailure | "too-many-saves" };

/**
 * What `updateOwnPoem` stores: already trimmed and checked by the action (edit-poem design D3).
 *
 * @public scaffold: first imported in task 2.3.
 */
export interface UpdateOwnPoemInput {
  readonly authorId: string;
  readonly poemId: string;
  readonly title: string;
  readonly text: string;
  /** `null` for the no-genre option. */
  readonly genreId: string | null;
  readonly illustration:
    | { readonly kind: typeof ILLUSTRATION_CHANGE.keep }
    | { readonly kind: typeof ILLUSTRATION_CHANGE.remove }
    | { readonly kind: typeof ILLUSTRATION_CHANGE.replace; readonly file: PoemIllustration };
}

/**
 * `update_my_poem()`'s answer after any upload and cleanup, or why it failed (edit-poem design D2, D3).
 *
 * @public scaffold: first imported in task 2.3.
 */
export type UpdateOwnPoemResult =
  | { readonly ok: true; readonly status: "updated"; readonly replacedPath: string | null }
  | { readonly ok: true; readonly status: "not-found" }
  | { readonly ok: false; readonly failure: ServiceFailure };
