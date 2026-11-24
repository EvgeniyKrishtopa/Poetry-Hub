/** At most this many featured poems, and at most this many project authors (the database caps both at 4, FR-2, FR-4). */
export const FEATURED_LIMIT = 4;

/** The latest-publications list shows this many poems (FR-5). */
export const LATEST_LIMIT = 4;

/** The author card's description is cut at this many characters, ending with «…» (FR-4). */
export const AUTHOR_DESCRIPTION_MAX_LENGTH = 120;

/** The hero's fallback image under `public/`, shown whenever the Home banner cannot be loaded (FR-B5). */
export const HERO_IMAGE_PATH = "/home-hero.jpg";

/** The key of the Greeting entry that holds the about section's title and message. */
export const ABOUT_GREETING_KEY = "about_project_home";

/** The key of the Greeting entry that holds the closing invitation's title and message. */
export const JOIN_GREETING_KEY = "call_to_action_signup";

/** The cover box's width hint for `next/image`: a quarter of the viewport in the 4-column grid, half in the 2-column, all in 1. */
export const WORK_COVER_SIZES = "(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw";

/** The author card's round photo, in CSS pixels (96 px in the mockups); also its `sizes` hint. */
export const AUTHOR_PHOTO_SIZE = 96;

/** The icon of a missing cover or photo, in CSS pixels. */
export const PLACEHOLDER_ICON_SIZE = 40;
