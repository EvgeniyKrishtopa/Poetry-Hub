import type { Poem } from "@/features/poems";
import type { ImageType } from "@/shared/lib/image-file/image-file.types";

import type { CREATE_POEM_STATUS, DELETE_POEM_STATUS } from "./poem-management.constants";

/** The add form's fields, as named in the submitted `FormData`. */
export type PoemFormField = "title" | "text" | "genreId" | "illustration";

/** One message per field. */
export type PoemFieldErrors = Readonly<Partial<Record<PoemFormField, string>>>;

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

/** The trail's last item for `/account/poems/<id>` (design D10). */
export type OwnPoemTitleResult =
  | { readonly ok: true; readonly title: string }
  | { readonly ok: false; readonly reason: "not-found" }
  | { readonly ok: false; readonly reason: "unavailable" };

/**
 * The delete action's answer (delete-poem design D3): another author's poem and a missing one are both
 * `not-found`, so the answer tells them apart for nobody.
 *
 * @public scaffold: first imported in task 2.4.
 */
export type DeletePoemResult =
  | { readonly status: typeof DELETE_POEM_STATUS.deleted }
  | { readonly status: typeof DELETE_POEM_STATUS.notFound }
  | { readonly status: typeof DELETE_POEM_STATUS.failed; readonly failure: ServiceFailure };

/**
 * `delete_my_poem()`'s answer, or why it couldn't be read (delete-poem design D2, D3).
 *
 * @public scaffold: first imported in task 2.3.
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

/**
 * What `/account/poems` shows once after a delete (delete-poem design D5).
 *
 * @public scaffold: first imported in task 4.2.
 */
export type DeletedPoemNotice = { readonly kind: "deleted"; readonly title: string } | { readonly kind: "already-deleted" };
