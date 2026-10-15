export type NameField = "first_name" | "last_name";

/** The four editor fields; each is saved and deleted on its own. */
export type ProfileField = NameField | "about" | "photo";

export type AboutAlign = "left" | "center" | "right";

/** Why a profile read or write failed, in the terms the editor shows (FR-9). */
export type ProfileFailure = "unauthenticated" | "unavailable" | "unknown";

export type ImageType = "png" | "jpeg";

export type PhotoFileCheck =
  | { readonly ok: true; readonly type: ImageType }
  | { readonly ok: false; readonly error: "too-large" | "unsupported-type" };

/** The owner's own profile; any field may be empty. */
export interface AuthorProfile {
  readonly id: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly about: string | null;
  readonly aboutAlign: AboutAlign;
  readonly photoUrl: string | null;
}

/** A public profile: both names are set. Never carries the auth user id. */
export interface PublicAuthor {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly about: string | null;
  readonly aboutAlign: AboutAlign;
  readonly photoUrl: string | null;
}

/** Content columns a field write may set; never id, user_id, or created_at. */
export type ProfileRowPatch = Readonly<
  Partial<{
    first_name: string | null;
    last_name: string | null;
    about: string | null;
    about_align: AboutAlign;
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

export type PublicAuthorsResult =
  | { readonly ok: true; readonly authors: readonly PublicAuthor[] }
  | { readonly ok: false; readonly reason: "unavailable" };

/** What every profile action returns as its data. */
export type ProfileActionResult =
  | { readonly status: "saved"; readonly profile: AuthorProfile | null }
  | { readonly status: "failed"; readonly failure: ProfileFailure };

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
  | { readonly status: "idle" }
  | { readonly status: "saved" }
  | { readonly status: "invalid"; readonly draft: Draft; readonly error: string }
  | { readonly status: "failed"; readonly draft: Draft; readonly failure: ProfileFailure };

export type MarkdownFormat = "bold" | "italic" | "heading" | "subheading" | "bulleted" | "numbered" | "quote";

export interface TextSelection {
  readonly start: number;
  readonly end: number;
}

export interface FormattedText {
  readonly text: string;
  readonly selection: TextSelection;
}
