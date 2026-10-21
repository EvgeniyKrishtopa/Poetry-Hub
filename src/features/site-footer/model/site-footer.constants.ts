import { ABOUT_PATH, PRIVACY_PATH } from "@/shared/config/constants";

/**
 * Final paths of the footer's pages. `/about` and `/privacy` have pages; until `/contact` ships, it shows
 * the not-found screen (design D3).
 */
export const FOOTER_LINK_PATHS = {
  about: ABOUT_PATH,
  privacy: PRIVACY_PATH,
  contact: "/contact",
} as const;

/** The order the footer lists its links in (FR-3). */
export const FOOTER_LINK_ORDER = ["about", "privacy", "contact"] as const satisfies ReadonlyArray<
  keyof typeof FOOTER_LINK_PATHS
>;

/** The year the site launched: the start of the copyright range. */
export const SITE_FOUNDING_YEAR = 2026;

/** Joins the founding year and the current year in the copyright range: an en dash, no spaces. */
export const YEAR_RANGE_SEPARATOR = "–";
