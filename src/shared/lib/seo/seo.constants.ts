/** The default share image (1200×630) every page without an illustration or a photo uses, served from `public/`. */
export const DEFAULT_SHARE_IMAGE_PATH = "/og-default.png";

/** The root layout's title template: a page's own title, then the site name (FR-1). */
export const TITLE_TEMPLATE = "%s | Поэтический Хаб";

/** The longest description a page carries, including the closing «…» of a shortened one (page-metadata NFR-4). */
export const DESCRIPTION_MAX_LENGTH = 160;

/** `og:locale` of every public page: the product's copy is Russian. */
export const OG_LOCALE = "ru_RU";

/** The server-side setting that holds the site's public address (FR-11). */
export const SITE_URL_ENV = "SITE_URL";

/** Vercel's system variable with the production host, without a scheme: the fallback when `SITE_URL` is not set. */
export const VERCEL_PRODUCTION_HOST_ENV = "VERCEL_PROJECT_PRODUCTION_URL";

/** The origin used when neither variable holds a usable address, so local development and CI need no setup. */
export const LOCAL_SITE_URL = "http://localhost:3000";

/** The sign-up email link's route handler; named once so `robots.txt` and the sitemap rules agree on it. */
export const AUTH_PATH = "/auth";

/** The route handlers under `app/api/`, named once for the same reason. */
export const API_PATH = "/api";
