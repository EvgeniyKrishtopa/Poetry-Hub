export const NAME_MAX_LENGTH = 60;
export const ABOUT_MAX_LENGTH = 1000;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export const AUTHOR_PHOTOS_BUCKET = "author-photos";

/** Explicit column lists: under the column grants, `*` fails with 42501 (design D2). */
export const OWNER_PROFILE_COLUMNS = "id, first_name, last_name, about, about_align, photo_path";
export const PUBLIC_AUTHOR_COLUMNS = OWNER_PROFILE_COLUMNS;

export const PHOTO_WIDTH = 300;
export const PHOTO_HEIGHT = 400;
