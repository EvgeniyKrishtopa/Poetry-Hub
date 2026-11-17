// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { checkSession } from "../../actions/session-check";
import { ADMIN_USER_ID } from "../support/rpc-mock";

vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));

describe("checkSession", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-12 of admin-moderation
  it.each([
    ["a signed-in session may act", { state: "signed-in", userId: ADMIN_USER_ID }, { ok: true }],
    ["a gone session is unauthenticated", { state: "signed-out" }, { ok: false, failure: "unauthenticated" }],
    ["an unreadable session is unavailable, never expired", { state: "unknown" }, { ok: false, failure: "unavailable" }],
  ] as const)("%s", async (_case, session, expected) => {
    vi.mocked(getSessionState).mockResolvedValue(session);

    await expect(checkSession()).resolves.toEqual(expected);
  });
});
