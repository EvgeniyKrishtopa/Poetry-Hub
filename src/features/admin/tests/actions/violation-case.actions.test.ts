// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { getSessionState } from "@/features/auth";

import { addViolationCaseAction, addViolationCaseForAuthorAction } from "../../actions/add-violation-case.actions";
import { removeViolationCaseAction } from "../../actions/remove-violation-case.actions";
import { setCaseGroundAction } from "../../actions/set-case-ground.actions";
import {
  addViolationCase,
  addViolationCaseForAuthor,
  removeViolationCase,
  setCaseGround,
} from "../../dal/violation-rpc";
import { MODERATION_FAILURE_MESSAGES } from "../../model/admin-messages";
import {
  ADMIN_USER_ID,
  AUTHOR_PROFILE_ID,
  CASE_ID,
  expectNothingSecretLogged,
  POEM_ID,
  TARGET_EMAIL,
  TARGET_USER_ID,
} from "../support/rpc-mock";

vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/violation-rpc", () => ({
  addViolationCase: vi.fn(),
  addViolationCaseForAuthor: vi.fn(),
  setCaseGround: vi.fn(),
  removeViolationCase: vi.fn(),
}));

type DalMock = Mock<(input: unknown) => Promise<unknown>>;

/** Each action with its one DAL function, a valid input, what the DAL is called with, and an invalid input. */
const ACTIONS = [
  {
    name: "addViolationCaseAction",
    action: addViolationCaseAction as (input: unknown) => Promise<{ data?: unknown; validationErrors?: unknown; serverError?: string }>,
    dal: addViolationCase as unknown as DalMock,
    input: { userId: TARGET_USER_ID, ground: "harmful-content", content: { kind: "poem", id: POEM_ID } },
    badInputs: [
      { userId: "42", ground: "harmful-content" },
      { userId: TARGET_USER_ID, ground: "spam" },
      { userId: TARGET_USER_ID, ground: "harmful-content", content: { kind: "poem", id: "x" } },
      { ground: "harmful-content" },
    ],
    success: { status: "added" },
    successAnswer: "added",
  },
  {
    name: "addViolationCaseForAuthorAction",
    action: addViolationCaseForAuthorAction as (input: unknown) => Promise<{ data?: unknown; validationErrors?: unknown; serverError?: string }>,
    dal: addViolationCaseForAuthor as unknown as DalMock,
    input: { authorProfileId: AUTHOR_PROFILE_ID, ground: "malicious-activity" },
    badInputs: [
      { authorProfileId: AUTHOR_PROFILE_ID.toUpperCase(), ground: "malicious-activity" },
      { authorProfileId: AUTHOR_PROFILE_ID, ground: "" },
      { userId: TARGET_USER_ID, ground: "malicious-activity" },
    ],
    success: { status: "added" },
    successAnswer: "added",
  },
  {
    name: "setCaseGroundAction",
    action: setCaseGroundAction as (input: unknown) => Promise<{ data?: unknown; validationErrors?: unknown; serverError?: string }>,
    dal: setCaseGround as unknown as DalMock,
    input: { caseId: CASE_ID, ground: "malicious-activity" },
    badInputs: [
      { caseId: "42", ground: "malicious-activity" },
      { caseId: CASE_ID, ground: "other" },
      { caseId: CASE_ID },
    ],
    success: {},
    successAnswer: "ground-changed",
  },
  {
    name: "removeViolationCaseAction",
    action: removeViolationCaseAction as (input: unknown) => Promise<{ data?: unknown; validationErrors?: unknown; serverError?: string }>,
    dal: removeViolationCase as unknown as DalMock,
    input: { caseId: CASE_ID },
    badInputs: [{ caseId: "" }, { caseId: CASE_ID.toUpperCase() }, {}],
    success: {},
    successAnswer: "removed",
  },
] as const;

const ALL_DAL_CALLS = ACTIONS.map(({ dal }) => dal);

function expectNoRpcCalled(): void {
  for (const call of ALL_DAL_CALLS) expect(call).not.toHaveBeenCalled();
}

describe.each(ACTIONS)("$name", ({ action, dal, input, badInputs, success, successAnswer }) => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: ADMIN_USER_ID });
    dal.mockResolvedValue({ ok: true, status: successAnswer });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-1, FR-2, FR-7 of admin-violations-feedback
  it("calls its one function with the validated input and returns the success", async () => {
    const result = await action(input);

    expect(result.data).toEqual({ ok: true, ...success });
    expect(dal).toHaveBeenCalledExactlyOnceWith(input);
    for (const other of ALL_DAL_CALLS.filter((call) => call !== dal)) expect(other).not.toHaveBeenCalled();
  });

  // implements FR-15 of admin-violations-feedback
  it.each(badInputs)("returns a validation error and calls no function, nor the session, for %j", async (bad) => {
    const result = await action(bad);

    expect(result.validationErrors).toBeDefined();
    expect(result.data).toBeUndefined();
    expectNoRpcCalled();
    expect(getSessionState).not.toHaveBeenCalled();
  });

  // implements FR-15 of admin-violations-feedback
  it("says the session ended, and calls no function, when the admin is signed out", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });

    const result = await action(input);

    expect(result.data).toEqual({ ok: false, reason: "unauthenticated" });
    expectNoRpcCalled();
  });

  // implements FR-15 of admin-violations-feedback
  it("says the service is unavailable, not that the session ended, when the session can't be checked", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });

    const result = await action(input);

    expect(result.data).toEqual({ ok: false, reason: "unavailable" });
    expectNoRpcCalled();
  });

  // implements FR-15 of admin-violations-feedback
  it.each([
    ["a refused admin check", "forbidden", "forbidden"],
    ["an ended session", "unauthenticated", "unauthenticated"],
    ["an outage", "unavailable", "unavailable"],
    ["an unknown failure", "unknown", "unavailable"],
  ] as const)("keeps %s apart from the others", async (_case, failure, reason) => {
    dal.mockResolvedValue({ ok: false, failure });

    const result = await action(input);

    expect(result.data).toEqual({ ok: false, reason });
    expect(MODERATION_FAILURE_MESSAGES[reason]).toBeTruthy();
  });

  // implements NFR-1 of admin-violations-feedback
  it("answers an unexpected throw with the generic message and logs the action and the error class only", async () => {
    dal.mockRejectedValue(new RangeError(`boom for ${TARGET_EMAIL} ${TARGET_USER_ID}`));

    const result = await action(input);

    expect(result.serverError).toBe(MODERATION_FAILURE_MESSAGES.unavailable);
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] action failed: RangeError");
    expectNothingSecretLogged();
  });
});

describe("addViolationCaseAction and addViolationCaseForAuthorAction, answers", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: ADMIN_USER_ID });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-1, FR-2, FR-15 of admin-violations-feedback
  it.each([
    ["already-in-list", { ok: true, status: "already-in-list" }],
    ["target-is-admin", { ok: false, reason: "target-is-admin" }],
    ["already-restricted", { ok: false, reason: "already-restricted" }],
    ["not-found", { ok: false, reason: "not-found" }],
    ["content-not-found", { ok: false, reason: "content-not-found" }],
  ] as const)("shows the answer %s as its own result", async (status, expected) => {
    vi.mocked(addViolationCase).mockResolvedValue({ ok: true, status });
    vi.mocked(addViolationCaseForAuthor).mockResolvedValue({ ok: true, status });

    const fromList = await addViolationCaseAction({ userId: TARGET_USER_ID, ground: "harmful-content" });
    const fromPage = await addViolationCaseForAuthorAction({
      authorProfileId: AUTHOR_PROFILE_ID,
      ground: "harmful-content",
    });

    expect(fromList.data).toEqual(expected);
    expect(fromPage.data).toEqual(expected);
  });
});

describe("setCaseGroundAction and removeViolationCaseAction, answers", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: ADMIN_USER_ID });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-7, FR-15 of admin-violations-feedback
  it("says the case is gone, as its own reason, when the case was closed or removed elsewhere", async () => {
    vi.mocked(setCaseGround).mockResolvedValue({ ok: true, status: "not-found" });
    vi.mocked(removeViolationCase).mockResolvedValue({ ok: true, status: "not-found" });

    const switched = await setCaseGroundAction({ caseId: CASE_ID, ground: "harmful-content" });
    const removed = await removeViolationCaseAction({ caseId: CASE_ID });

    expect(switched.data).toEqual({ ok: false, reason: "case-not-found" });
    expect(removed.data).toEqual({ ok: false, reason: "case-not-found" });
  });
});
