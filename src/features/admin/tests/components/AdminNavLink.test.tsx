import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { AdminNavLinkContent } from "../../components/AdminNavLink/AdminNavLinkContent";
import { checkIsAdmin } from "../../dal/admin-check";

vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/admin-check", () => ({ checkIsAdmin: vi.fn() }));

const SIGNED_IN = {
  state: "signed-in",
  userId: "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b",
} as const;

afterEach(() => vi.clearAllMocks());

describe("AdminNavLinkContent", () => {
  // implements FR-20 of admin-moderation
  it("links to /admin for a signed-in admin", async () => {
    vi.mocked(getSessionState).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkIsAdmin).mockResolvedValue({ ok: true, isAdmin: true });

    render(await AdminNavLinkContent());

    expect(screen.getByRole("link", { name: "Админка" })).toHaveAttribute("href", "/admin");
  });

  // implements FR-20 of admin-moderation
  it("renders nothing for a signed-in non-admin and for an unreadable admin check", async () => {
    vi.mocked(getSessionState).mockResolvedValue(SIGNED_IN);
    vi.mocked(checkIsAdmin).mockResolvedValueOnce({ ok: true, isAdmin: false });
    expect(await AdminNavLinkContent()).toBeNull();

    vi.mocked(checkIsAdmin).mockResolvedValueOnce({
      ok: false,
      failure: "unavailable",
    });
    expect(await AdminNavLinkContent()).toBeNull();
  });

  // implements FR-20 of admin-moderation
  it("renders nothing and asks no RPC for a guest or an unreadable session", async () => {
    vi.mocked(getSessionState).mockResolvedValueOnce({ state: "signed-out" });
    expect(await AdminNavLinkContent()).toBeNull();

    vi.mocked(getSessionState).mockResolvedValueOnce({ state: "unknown" });
    expect(await AdminNavLinkContent()).toBeNull();

    expect(checkIsAdmin).not.toHaveBeenCalled();
  });
});
