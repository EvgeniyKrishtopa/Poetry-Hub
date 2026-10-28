import type { MarkdownFormat } from "@/shared/lib/markdown/markdown.types";

export const NAME_MAX_LENGTH = 60;
export const ABOUT_MAX_LENGTH = 1000;

/** About's toolbar buttons, in order (FR-11). */
export const ABOUT_MARKDOWN_FORMATS: readonly MarkdownFormat[] = [
  "bold",
  "italic",
  "heading",
  "subheading",
  "bulleted",
  "numbered",
  "quote",
];

export const AUTHOR_PHOTOS_BUCKET = "author-photos";

/** The owner's editor page: the account page's links and the public page's owner link point here. */
export const AUTHOR_EDITOR_PATH = "/account/author";

/** The author directory; each public author page lives under it (`author-page-path.ts`). */
export const AUTHORS_PATH = "/authors";

/** Explicit column lists: under the column grants, `*` fails with 42501 (design D2). */
export const OWNER_PROFILE_COLUMNS = "id, first_name, last_name, about, photo_path";
/**
 * The same list today; a separate name so the public reads can narrow it without touching the owner's.
 * @alias
 */
export const PUBLIC_AUTHOR_COLUMNS = OWNER_PROFILE_COLUMNS;

export const PHOTO_WIDTH = 300;
export const PHOTO_HEIGHT = 400;

/**
 * `next/image` sizes for the photo (FR-16): 300 px from a 460 px viewport up, below that the
 * content column's width (the viewport minus the `px-6` gutters on both sides).
 */
export const PHOTO_SIZES = "(min-width: 460px) 300px, calc(100vw - 3rem)";

/** A profile action's result status (`ProfileActionResult`). */
export const ACTION_STATUS = { saved: "saved", failed: "failed" } as const;

/** One field's form status (`FieldFormState`). */
export const FORM_STATUS = { idle: "idle", saved: "saved", invalid: "invalid", failed: "failed" } as const;

/** The two actions a field runs: save its draft, or delete its value. */
export const FIELD_ACTION = { save: "save", delete: "delete" } as const;

/** The per-user write limits' scopes, mirrored by the `write_rate_limits.scope` check (FR-21, design D13). */
export const WRITE_SCOPES = { profileWrite: "profile_write", photoUpload: "photo_upload" } as const;

/** A field shows its value (view) or its input (edit). */
export const FIELD_MODE = { view: "view", edit: "edit" } as const;
