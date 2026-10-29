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

/** The management pages' h1: 30/36 below 640 px, 36/40 above (the approved mockup's page frame). */
export const PAGE_HEADING_CLASS = "text-3xl font-bold tracking-tight sm:text-4xl";

/** The create action's outcomes. */
export const CREATE_POEM_STATUS = {
  created: "created",
  invalid: "invalid",
  failed: "failed",
} as const;
