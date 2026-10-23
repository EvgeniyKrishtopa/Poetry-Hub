import { ABOUT_PATH, PRIVACY_PATH } from "@/shared/config/constants";

/** Paths of the footer's pages. */
export const FOOTER_LINK_PATHS = {
  about: ABOUT_PATH,
  privacy: PRIVACY_PATH,
} as const;

/** The order the footer lists its links in (FR-3). */
export const FOOTER_LINK_ORDER = ["about", "privacy"] as const satisfies ReadonlyArray<keyof typeof FOOTER_LINK_PATHS>;

/** The footer links' look; the root layout gives it to the contact button too, so all items match. */
export const FOOTER_LINK_CLASS =
  "text-muted transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** The year the site launched: the start of the copyright range. */
export const SITE_FOUNDING_YEAR = 2026;

/** Joins the founding year and the current year in the copyright range: an en dash, no spaces. */
export const YEAR_RANGE_SEPARATOR = "–";
