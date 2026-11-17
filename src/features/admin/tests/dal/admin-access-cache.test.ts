// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

const cacheSpy = vi.hoisted(() => vi.fn(<Args extends unknown[], Result>(fn: (...args: Args) => Result) => fn));

vi.mock("react", async (importOriginal) => ({ ...(await importOriginal<typeof import("react")>()), cache: cacheSpy }));
vi.mock("../../dal/admin-check", () => ({ checkIsAdmin: vi.fn() }));

const ADMIN_DIR = "src/features/admin";
const ADMIN_ACCESS_IMPORT = /from ["']\.\.\/\.\.\/dal\/admin-access["']/;

describe("readAdminAccess and React's cache", () => {
  // implements FR-21 of admin-moderation: one `is_admin()` answer per request across the header, the slot and the page
  it("is wrapped in cache(), once, so every caller of one request shares one answer", async () => {
    const { readAdminAccess } = await import("../../dal/admin-access");

    expect(cacheSpy).toHaveBeenCalledOnce();
    expect(typeof readAdminAccess).toBe("function");
  });

  // implements FR-21 of admin-moderation
  it("is the one function the gate and the page gate both read the admin check through", () => {
    for (const file of ["AdminOnly/AdminOnlyContent.tsx", "AdminPageContent/AdminPageContent.tsx"]) {
      const source = readFileSync(join(ADMIN_DIR, "components", file), "utf8");

      expect(source, file).toMatch(ADMIN_ACCESS_IMPORT);
      expect(source, file).not.toMatch(/checkIsAdmin/);
    }
  });
});
