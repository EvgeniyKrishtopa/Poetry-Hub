/**
 * The one `next/image` quality the optimizer serves (Next 16 rejects any other via `images.qualities`).
 * Below the default 75: on photos the difference is hard to see, and the files are noticeably smaller on slow mobile connections.
 */
export const IMAGE_QUALITY = 60;

/**
 * `lang` of the product's Russian copy (the authors pages and the header links). The document itself
 * stays `lang="en"` while the auth screens are in English, so each Russian block carries this.
 */
export const CONTENT_LANG = "ru";

/** What a session check found: a valid session, none, or no answer (Supabase unreachable or failing). */
export const SESSION_STATE = {
  signedIn: "signed-in",
  signedOut: "signed-out",
  unknown: "unknown",
} as const;
