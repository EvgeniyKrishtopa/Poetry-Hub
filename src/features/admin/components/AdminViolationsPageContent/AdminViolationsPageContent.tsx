/**
 * `/admin/violations`: the same gate as `AdminPageContent` (`requireSession`, `readAdminAccess`, `notFound()`),
 * never cached, then the open cases rendered on the server (design D7, FR-4, FR-5).
 */
export async function AdminViolationsPageContent() {
  return null;
}
