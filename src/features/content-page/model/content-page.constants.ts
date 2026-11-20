import { ABOUT_PATH, PRIVACY_PATH } from "@/shared/config/constants";

import type { ContentPageKey } from "./content-page.types";

/** The Contentful `greeting` entry each content page shows, by page. */
export const CONTENT_PAGE_KEYS = {
  about: "about_page",
  privacyPolicy: "privacy_policy",
} as const;

/** The route each content page is served at: the base of its canonical URL (seo-metadata FR-3). */
export const CONTENT_PAGE_PATHS: Readonly<Record<ContentPageKey, string>> = {
  [CONTENT_PAGE_KEYS.about]: ABOUT_PATH,
  [CONTENT_PAGE_KEYS.privacyPolicy]: PRIVACY_PATH,
};
