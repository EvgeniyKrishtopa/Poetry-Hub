/** Final paths of the footer's pages; until those pages ship, each shows the not-found screen (design D3). */
export const FOOTER_LINK_PATHS = {
  about: "/about",
  privacy: "/privacy",
  contact: "/contact",
} as const;

/** The year the site launched: the start of the copyright range. */
export const SITE_FOUNDING_YEAR = 2026;

/** Joins the founding year and the current year in the copyright range: an en dash, no spaces. */
export const YEAR_RANGE_SEPARATOR = "–";
