// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { getSessionState } from "@/features/auth";

import { banUserAction } from "../../actions/ban-user.actions";
import { blockUserAction } from "../../actions/block-user.actions";
import { revokeSessionsAction } from "../../actions/revoke-sessions.actions";
import { sendActionNotice } from "../../actions/send-action-notice";
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
vi.mock("../../actions/send-action-notice", () => ({ sendActionNotice: vi.fn() }));

const SENT = { outcome: "sent" } as const;

/** What block and ban's database answer carries for the email. */
const NOTICE_SOURCE = { noticeEmail: TARGET_EMAIL, ground: "harmful-content" } as const;

type DalMock = Mock<(input: { userId: string }) => Promise<unknown>>;

/** Each action with the one DAL function it calls, the answer that function gives and the success the row shows. */
const ACTIONS = [
  {
    name: "blockUserAction",
    action: blockUserAction,
    dal: blockUser as unknown as DalMock,
    answer: { ok: true, status: "blocked", ...NOTICE_SOURCE },
    shown: { ok: true, status: "blocked", notice: SENT },
  },
  {
    name: "unblockUserAction",
    action: unblockUserAction,
    dal: unblockUser as unknown as DalMock,
    answer: { ok: true, status: "unblocked" },
    shown: { ok: true, status: "unblocked" },
  },
  {
    name: "banUserAction",
    action: banUserAction,
    dal: banUser as unknown as DalMock,
    answer: { ok: true, status: "banned", ...NOTICE_SOURCE },
    shown: { ok: true, status: "banned", notice: SENT },
  },
  {
    name: "revokeSessionsAction",
    action: revokeSessionsAction,
    dal: revokeSessions as unknown as DalMock,
    answer: { ok: true, status: "revoked" },
    shown: { ok: true, status: "revoked" },
  },
] as const;

const ALL_DAL_CALLS = ACTIONS.map(({ dal }) => dal);

function expectNoRpcCalled(): void {
  for (const call of ALL_DAL_CALLS) expect(call).not.toHaveBeenCalled();
}

describe.each(ACTIONS)("$name", ({ action, dal, answer, shown }) => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: ADMIN_USER_ID, aal: "aal1", amr: [] });
    dal.mockResolvedValue(answer);
    vi.mocked(sendActionNotice).mockResolvedValue(SENT);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-4, FR-5, FR-6 of admin-moderation
  it("calls its one function with the validated target and returns the success the row shows", async () => {
    const result = await action({ userId: TARGET_USER_ID });

    expect(result.data).toEqual(shown);
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
    dal.mockResolvedValue({ ok: false, failure });

    const result = await action({ userId: TARGET_USER_ID });

    expect(result.data).toEqual({ ok: false, reason });
    expect(MODERATION_FAILURE_MESSAGES[reason]).toBeTruthy();
    expect(sendActionNotice).not.toHaveBeenCalled();
  });

  // implements FR-12 of admin-moderation
  it.each(["already-restricted", "not-blocked", "target-is-admin", "not-found"] as const)(
    "shows the answer %s as a failure of the same name",
    async (answer) => {
      dal.mockResolvedValue({ ok: true, status: answer });

      const result = await action({ userId: TARGET_USER_ID });

      expect(result.data).toEqual({ ok: false, reason: answer });
      expect(MODERATION_FAILURE_MESSAGES[answer]).toBeTruthy();
      expect(sendActionNotice).not.toHaveBeenCalled();
    },
  );

  // implements NFR-6 of admin-moderation
  it("answers an unexpected throw with the generic message and logs the action and the error class only", async () => {
    dal.mockRejectedValue(new RangeError(`boom for ${TARGET_EMAIL} ${TARGET_USER_ID}`));

    const result = await action({ userId: TARGET_USER_ID });

    expect(result.serverError).toBe(MODERATION_FAILURE_MESSAGES.unavailable);
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] action failed: RangeError");
    expectNothingSecretLogged();
  });
});

// implements FR-6 of admin-moderation
describe("revokeSessionsAction, nothing to revoke", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: ADMIN_USER_ID, aal: "aal1", amr: [] });
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

describe("the standard email after a restriction", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: ADMIN_USER_ID, aal: "aal1", amr: [] });
    vi.mocked(sendActionNotice).mockResolvedValue(SENT);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-9 of moderation-notifications
  it.each([
    { name: "block", action: blockUserAction, dal: blockUser, status: "blocked" },
    { name: "ban", action: banUserAction, dal: banUser, status: "banned" },
  ] as const)("sends one $name email, after the restriction, to the address and ground the database gave", async ({
    name,
    action,
    dal,
    status,
  }) => {
    (dal as unknown as DalMock).mockResolvedValue({ ok: true, status, ...NOTICE_SOURCE });

    await action({ userId: TARGET_USER_ID });

    expect(sendActionNotice).toHaveBeenCalledExactlyOnceWith({
      kind: name,
      userId: TARGET_USER_ID,
      email: TARGET_EMAIL,
      ground: "harmful-content",
      title: null,
    });
    expect(vi.mocked(dal).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(sendActionNotice).mock.invocationCallOrder[0] ?? 0,
    );
  });

  // implements FR-9 of moderation-notifications
  it.each([
    { name: "unblock", action: unblockUserAction, dal: unblockUser, status: "unblocked" },
    { name: "revoke", action: revokeSessionsAction, dal: revokeSessions, status: "revoked" },
  ] as const)("sends nothing after $name", async ({ action, dal, status }) => {
    (dal as unknown as DalMock).mockResolvedValue({ ok: true, status });

    await action({ userId: TARGET_USER_ID });

    expect(sendActionNotice).not.toHaveBeenCalled();
  });

  // implements FR-14 of moderation-notifications
  it("keeps the block a success, carrying the failed notice, and tells an account with no address apart", async () => {
    (blockUser as unknown as DalMock).mockResolvedValue({ ok: true, status: "blocked", noticeEmail: null, ground: null });
    vi.mocked(sendActionNotice).mockResolvedValue({ outcome: "failed", cause: "no-address" });

    const result = await blockUserAction({ userId: TARGET_USER_ID });

    expect(sendActionNotice).toHaveBeenCalledWith(expect.objectContaining({ email: null, ground: null }));
    expect(result.data).toEqual({ ok: true, status: "blocked", notice: { outcome: "failed", cause: "no-address" } });
  });
});
