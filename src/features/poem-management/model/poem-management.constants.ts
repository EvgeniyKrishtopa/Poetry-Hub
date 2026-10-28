/** Title limit in code points after trimming (FR-4). */
export const TITLE_MAX_LENGTH = 80;

/** Text limit in code points after trimming (FR-4). */
export const TEXT_MAX_LENGTH = 10000;

/** The no-genre option's value: the colon is outside the tag-id alphabet, so no tag collides (design D5). */
export const NO_GENRE = ":none";

/** The public Storage bucket of poem illustrations (design D2). */
export const POEM_ILLUSTRATIONS_BUCKET = "poem-illustrations";

/** The create action's outcomes. */
export const CREATE_POEM_STATUS = {
  created: "created",
  invalid: "invalid",
  failed: "failed",
} as const;
