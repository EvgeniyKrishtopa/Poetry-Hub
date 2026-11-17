import { afterEach, describe, expect, it, vi } from "vitest";

import { checkIsAdmin } from "../../dal/admin-check";
import { readAdminAccess } from "../../dal/admin-access";

vi.mock("../../dal/admin-check", () => ({ checkIsAdmin: vi.fn() }));

afterEach(() => vi.clearAllMocks());

describe("readAdminAccess", () => {
  // implements FR-2, FR-20 of admin-moderation
  it("answers admin or not-admin from the database for a signed-in reader", async () => {
    vi.mocked(checkIsAdmin).mockResolvedValueOnce({ ok: true, isAdmin: true });
    expect(await readAdminAccess("signed-in")).toBe("admin");

    vi.mocked(checkIsAdmin).mockResolvedValueOnce({ ok: true, isAdmin: false });
    expect(await readAdminAccess("signed-in")).toBe("not-admin");
  });

  // implements FR-2 of admin-moderation
  it("answers unavailable, never not-admin, when the check fails or the session is unreadable, asking nothing for the latter", async () => {
    vi.mocked(checkIsAdmin).mockResolvedValueOnce({ ok: false, failure: "unavailable" });
    expect(await readAdminAccess("signed-in")).toBe("unavailable");

    vi.mocked(checkIsAdmin).mockClear();
    expect(await readAdminAccess("unknown")).toBe("unavailable");
    expect(checkIsAdmin).not.toHaveBeenCalled();
  });
});
