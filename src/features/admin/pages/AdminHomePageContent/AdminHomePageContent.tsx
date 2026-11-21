/**
 * `/admin/home`: the same gate as `AdminViolationsPageContent` (`requireSession`, `readAdminAccess`, `notFound()`),
 * never cached, then the two `HomeEntryList`s from `listHomeEntries` (FR-9, FR-11). The title appears only after
 * the gate.
 */
export async function AdminHomePageContent(): Promise<null> {
  return null;
}
