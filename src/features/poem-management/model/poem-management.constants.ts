import type { MarkdownFormat } from "@/shared/lib/markdown/markdown.types";

import type { PoemFormField } from "./poem-management.types";

/** Title limit in code points after trimming (FR-4). */
export const TITLE_MAX_LENGTH = 80;

/** Text limit in code points after trimming (FR-4). */
export const TEXT_MAX_LENGTH = 10000;

/** The no-genre option's value: the colon is outside the tag-id alphabet, so no tag collides (design D5). */
export const NO_GENRE = ":none";

/** The genre dropdown's first option, «—»: an empty value, so the field rules report it as required. */
export const GENRE_PLACEHOLDER = "";

/** The form's fields in page order: the first invalid one takes focus (NFR-7). */
export const POEM_FORM_FIELDS: readonly PoemFormField[] = ["title", "text", "genreId", "illustration"];

/** The poem toolbar: no headings or lists (FR-3, design D6). */
export const POEM_MARKDOWN_FORMATS: readonly MarkdownFormat[] = ["bold", "italic", "epigraph", "separator", "indent"];

/** The chosen illustration's preview box, 16:9 like the poem page's frame; the browser serves the file as is. */
export const ILLUSTRATION_PREVIEW_WIDTH = 1280;
export const ILLUSTRATION_PREVIEW_HEIGHT = 720;

/** The create action's outcomes. */
export const CREATE_POEM_STATUS = {
  created: "created",
  invalid: "invalid",
  failed: "failed",
} as const;

/** The delete action's outcomes (delete-poem design D3). */
export const DELETE_POEM_STATUS = {
  deleted: "deleted",
  notFound: "not-found",
  failed: "failed",
} as const;

/** The update action's outcomes (edit-poem design D3). */
export const UPDATE_POEM_STATUS = {
  saved: "saved",
  invalid: "invalid",
  notFound: "not-found",
  failed: "failed",
} as const;

/** What a save does with the illustration (edit-poem design D2, D3). */
export const ILLUSTRATION_CHANGE = {
  keep: "keep",
  remove: "remove",
  replace: "replace",
} as const;

/** The edit page's last path segment, `/account/poems/<poemId>/edit`. */
export const EDIT_SEGMENT = "edit";
