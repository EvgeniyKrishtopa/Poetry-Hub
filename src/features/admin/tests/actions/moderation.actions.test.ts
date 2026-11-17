// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { banUserAction } from "../../actions/ban-user.actions";
import { blockUserAction } from "../../actions/block-user.actions";
import { revokeSessionsAction } from "../../actions/revoke-sessions.actions";
import { unblockUserAction } from "../../actions/unblock-user.actions";
import { banUser, blockUser, revokeSessions, unblockUser } from "../../dal/moderation-rpc";
import { MODERATION_FAILURE_MESSAGES } from "../../model/admin-messages";
import { ADMIN_USER_ID, expectNothingSecretLogged, TARGET_EMAIL, TARGET_USER_ID } from "../support/rpc-mock";

vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/moderation-rpc", () => ({
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  banUser: vi.fn(),
  revokeSessions: vi.fn(),
}));

/** Each action with the one DAL function it calls and the success it shows. */
const ACTIONS = [
  { name: "blockUserAction", action: blockUserAction, dal: blockUser, status: "blocked" },
  { name: "unblockUserAction", action: unblockUserAction, dal: unblockUser, status: "unblocked" },
  { name: "banUserAction", action: banUserAction, dal: banUser, status: "banned" },
  { name: "revokeSessionsAction", action: revokeSessionsAction, dal: revokeSessions, status: "revoked" },
] as const;

const ALL_DAL_CALLS = [blockUser, unblockUser, banUser, revokeSessions];

function expectNoRpcCalled(): void {
  for (const call of ALL_DAL_CALLS) expect(call).not.toHaveBeenCalled();
}

describe.each(ACTIONS)("$name", ({ action, dal, status }) => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: ADMIN_USER_ID });
    vi.mocked(dal).mockResolvedValue({ ok: true, status });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-4, FR-5, FR-6 of admin-moderation
  it("calls its one function with the validated target and returns the success the row shows", async () => {
    const result = await action({ userId: TARGET_USER_ID });

    expect(result.data).toEqual({ ok: true, status });
    expect(dal).toHaveBeenCalledExactlyOnceWith({ userId: TARGET_USER_ID });
    for (const other of ALL_DAL_CALLS.filter((call) => call !== dal)) expect(other).not.toHaveBeenCalled();
  });

  // implements FR-12 of admin-moderation
  it.each(["42", "", TARGET_USER_ID.toUpperCase(), TARGET_EMAIL])(
    "returns a validation error and calls no function for the target %j",
    async (userId) => {
      const result = await action({ userId });

      expect(result.validationErrors).toBeDefined();
      expect(result.data).toBeUndefined();
      expectNoRpcCalled();
      expect(getSessionState).not.toHaveBeenCalled();
    },
  );

  // implements FR-12 of admin-moderation
  it("returns a validation error for a missing target", async () => {
    const result = await (action as (input: unknown) => ReturnType<typeof action>)({});

    expect(result.validationErrors).toBeDefined();
    expectNoRpcCalled();
  });

  // implements FR-12 of admin-moderation
  it("says the session ended, and calls no function, when the admin is signed out", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });

    const result = await action({ userId: TARGET_USER_ID });

    expect(result.data).toEqual({ ok: false, reason: "unauthenticated" });
    expectNoRpcCalled();
  });

  // implements FR-12 of admin-moderation
  it("says the service is unavailable, not that the session ended, when the session can't be checked", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });

    const result = await action({ userId: TARGET_USER_ID });

    expect(result.data).toEqual({ ok: false, reason: "unavailable" });
    expectNoRpcCalled();
  });

  // implements FR-12 of admin-moderation
  it.each([
    ["a refused admin check", "forbidden", "forbidden"],
    ["an ended session", "unauthenticated", "unauthenticated"],
    ["an outage", "unavailable", "unavailable"],
    ["an unknown failure", "unknown", "unavailable"],
  ] as const)("keeps %s apart from the others and shows a message of its own", async (_case, failure, reason) => {
    vi.mocked(dal).mockResolvedValue({ ok: false, failure });

    const result = await action({ userId: TARGET_USER_ID });

    expect(result.data).toEqual({ ok: false, reason });
    expect(MODERATION_FAILURE_MESSAGES[reason]).toBeTruthy();
  });

  // implements FR-12 of admin-moderation
  it.each(["already-restricted", "not-blocked", "target-is-admin", "not-found"] as const)(
    "shows the answer %s as a failure of the same name",
    async (answer) => {
      vi.mocked(dal).mockResolvedValue({ ok: true, status: answer });

      const result = await action({ userId: TARGET_USER_ID });

      expect(result.data).toEqual({ ok: false, reason: answer });
      expect(MODERATION_FAILURE_MESSAGES[answer]).toBeTruthy();
    },
  );

  // implements NFR-6 of admin-moderation
  it("answers an unexpected throw with the generic message and logs the action and the error class only", async () => {
    vi.mocked(dal).mockRejectedValue(new RangeError(`boom for ${TARGET_EMAIL} ${TARGET_USER_ID}`));

    const result = await action({ userId: TARGET_USER_ID });

    expect(result.serverError).toBe(MODERATION_FAILURE_MESSAGES.unavailable);
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] action failed: RangeError");
    expectNothingSecretLogged();
  });
});

// implements FR-6 of admin-moderation
describe("revokeSessionsAction, nothing to revoke", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: ADMIN_USER_ID });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the no-sessions success, which the page says in its own words, not a failure", async () => {
    vi.mocked(revokeSessions).mockResolvedValue({ ok: true, status: "no-sessions" });

    const result = await revokeSessionsAction({ userId: TARGET_USER_ID });

    expect(result.data).toEqual({ ok: true, status: "no-sessions" });
  });
});
