/** UTC, so the server and the browser print the same day for one stored instant (no hydration mismatch). */
const ADMIN_DATE_FORMAT = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const ADMIN_TIME_FORMAT = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

const UTC_LABEL = "UTC";

/** A stored timestamp as «12 ноября 2026 г.». */
export function formatAdminDate(iso: string): string {
  return ADMIN_DATE_FORMAT.format(new Date(iso));
}

/**
 * A stored timestamp with its UTC time, labelled as UTC: the case deadline, never a countdown (FR-5). The two parts are
 * joined here, not by one `Intl` pattern, whose date-time connector differs between ICU versions and would print
 * different text on the server and in the browser.
 */
export function formatAdminDateTime(iso: string): string {
  const date = new Date(iso);
  return `${ADMIN_DATE_FORMAT.format(date)}, ${ADMIN_TIME_FORMAT.format(date)} ${UTC_LABEL}`;
}
