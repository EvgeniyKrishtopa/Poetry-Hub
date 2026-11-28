import { afterEach, describe, expect, it, vi } from "vitest";

import { checkIsAdmin } from "../../dal/admin-check";
import { readAdminAccess } from "../../dal/admin-access";

vi.mock("../../dal/admin-check", () => ({ checkIsAdmin: vi.fn() }));

afterEach(() => vi.clearAllMocks());

const VERIFIED = { state: "signed-in", userId: "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b", aal: "aal2", amr: [] } as const;
const PASSWORD_ONLY = { ...VERIFIED, aal: "aal1" } as const;
const UNREADABLE = { state: "unknown" } as const;

describe("readAdminAccess", () => {
  // implements FR-2, FR-20 of admin-moderation
  it("answers admin or not-admin from the database for a signed-in reader", async () => {
    vi.mocked(checkIsAdmin).mockResolvedValueOnce({ ok: true, isAdmin: true });
    expect(await readAdminAccess(VERIFIED)).toBe("admin");

    vi.mocked(checkIsAdmin).mockResolvedValueOnce({ ok: true, isAdmin: false });
    expect(await readAdminAccess(VERIFIED)).toBe("not-admin");
  });

  // implements FR-8 of pre-deploy-security-hardening
  it("answers needs-second-factor for an admin below aal2, and not-admin for anyone else at that level", async () => {
    vi.mocked(checkIsAdmin).mockResolvedValueOnce({ ok: true, isAdmin: true });
    expect(await readAdminAccess(PASSWORD_ONLY)).toBe("needs-second-factor");

    vi.mocked(checkIsAdmin).mockResolvedValueOnce({ ok: true, isAdmin: false });
    expect(await readAdminAccess(PASSWORD_ONLY)).toBe("not-admin");
  });

  // implements FR-2 of admin-moderation; FR-8 of pre-deploy-security-hardening
  it("answers unavailable, never another answer, when the check fails or the session is unreadable", async () => {
    vi.mocked(checkIsAdmin).mockResolvedValueOnce({ ok: false, failure: "unavailable" });
    expect(await readAdminAccess(PASSWORD_ONLY)).toBe("unavailable");

    vi.mocked(checkIsAdmin).mockClear();
    expect(await readAdminAccess(UNREADABLE)).toBe("unavailable");
    expect(checkIsAdmin).not.toHaveBeenCalled();
  });
});
