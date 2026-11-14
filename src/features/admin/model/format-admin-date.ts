/** UTC, so the server and the browser print the same day for one stored instant (no hydration mismatch). */
const ADMIN_DATE_FORMAT = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** A stored timestamp as «12 ноября 2026 г.». */
export function formatAdminDate(iso: string): string {
  return ADMIN_DATE_FORMAT.format(new Date(iso));
}
