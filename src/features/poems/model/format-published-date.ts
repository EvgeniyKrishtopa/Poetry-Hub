/**
 * Russian long form: day, month name in the genitive, year, and the year abbreviation (the
 * proposal's UI copy table has the example). The date is read and formatted in UTC, so the
 * server's time zone never shifts the day.
 */
const PUBLISHED_DATE_FORMAT = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Formats an ISO date (`YYYY-MM-DD`) for the poem page footer. */
export function formatPublishedDate(isoDate: string): string {
  return PUBLISHED_DATE_FORMAT.format(new Date(`${isoDate}T00:00:00Z`));
}
