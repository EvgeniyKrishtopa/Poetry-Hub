// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

const cacheSpy = vi.hoisted(() => vi.fn(<Args extends unknown[], Result>(fn: (...args: Args) => Result) => fn));

vi.mock("react", async (importOriginal) => ({ ...(await importOriginal<typeof import("react")>()), cache: cacheSpy }));
vi.mock("../../dal/admin-check", () => ({ checkIsAdmin: vi.fn() }));

const ADMIN_DIR = "src/features/admin";
const ADMIN_ACCESS_IMPORT = /from ["']\.\.\/\.\.\/dal\/admin-access["']/;

// A structural guard, not a proof of deduplication: outside a server request React's cache() just runs the function, so
// these tests only fail when someone unwraps cache() or reads the admin check around `readAdminAccess`. The runtime
// effect (one `is_admin()` request per `/admin` page load) was counted in the Kong log during the group 8 web-qa pass.
describe("readAdminAccess and React's cache (structural guard)", () => {
  // implements FR-21 of admin-moderation: one `is_admin()` answer per request across the header, the slot and the page
  it("stays wrapped in cache(), exactly once, so the callers of one request can share one answer", async () => {
    const { readAdminAccess } = await import("../../dal/admin-access");

    expect(cacheSpy).toHaveBeenCalledOnce();
    expect(typeof readAdminAccess).toBe("function");
  });

  // implements FR-21 of admin-moderation
  it("keeps the gate and the page gate reading the admin check only through that one function", () => {
    for (const file of [
      "components/AdminOnly/AdminOnlyContent.tsx",
      "pages/UserModerationPage/UserModerationPageContent.tsx",
      "pages/ViolationReviewPage/ViolationReviewPageContent.tsx",
    ]) {
      const source = readFileSync(join(ADMIN_DIR, file), "utf8");

      expect(source, file).toMatch(ADMIN_ACCESS_IMPORT);
      expect(source, file).not.toMatch(/checkIsAdmin/);
    }
  });
});
