// @vitest-environment node
import { refresh, updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { getSessionState } from "@/features/auth";
import { HOME_FEATURED_TAG } from "@/shared/config/cache-tags";

import { addHomeAuthorAction } from "../../actions/add-home-author.actions";
import { addHomePoemAction } from "../../actions/add-home-poem.actions";
import { moveHomeEntryAction } from "../../actions/move-home-entry.actions";
import { removeHomeEntryAction } from "../../actions/remove-home-entry.actions";
import { addHomeAuthor, addHomePoem, moveHomeEntry, removeHomeEntry } from "../../dal/home-rpc";
import { MODERATION_FAILURE_MESSAGES } from "../../model/admin-messages";
import { ADMIN_USER_ID, AUTHOR_PROFILE_ID, expectNothingSecretLogged, POEM_ID, TARGET_EMAIL } from "../support/rpc-mock";

vi.mock("next/cache", () => ({ updateTag: vi.fn(), refresh: vi.fn() }));
vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/home-rpc", () => ({
  addHomePoem: vi.fn(),
  addHomeAuthor: vi.fn(),
  moveHomeEntry: vi.fn(),
  removeHomeEntry: vi.fn(),
}));

type DalMock = Mock<(input: unknown) => Promise<unknown>>;
type ActionAnswer = { data?: unknown; validationErrors?: unknown; serverError?: string };

/** Each action with its one DAL function, a valid input, and the inputs its schema must refuse. */
const ACTIONS = [
  {
    name: "addHomePoemAction",
    action: addHomePoemAction as (input: unknown) => Promise<ActionAnswer>,
    dal: addHomePoem as unknown as DalMock,
    input: { poemId: POEM_ID },
    badInputs: [{ poemId: "42" }, { poemId: POEM_ID.toUpperCase() }, { authorProfileId: POEM_ID }, {}],
    successStatus: "added",
  },
  {
    name: "addHomeAuthorAction",
    action: addHomeAuthorAction as (input: unknown) => Promise<ActionAnswer>,
    dal: addHomeAuthor as unknown as DalMock,
    input: { authorProfileId: AUTHOR_PROFILE_ID },
    badInputs: [{ authorProfileId: "" }, { authorProfileId: AUTHOR_PROFILE_ID.toUpperCase() }, { poemId: POEM_ID }, {}],
    successStatus: "added",
  },
  {
    name: "moveHomeEntryAction",
    action: moveHomeEntryAction as (input: unknown) => Promise<ActionAnswer>,
    dal: moveHomeEntry as unknown as DalMock,
    input: { kind: "poem", id: POEM_ID, fromPosition: 3, toPosition: 1 },
    badInputs: [
      { kind: "collection", id: POEM_ID, fromPosition: 3, toPosition: 1 },
      { kind: "poem", id: "42", fromPosition: 3, toPosition: 1 },
      { kind: "poem", id: POEM_ID, fromPosition: 0, toPosition: 1 },
      { kind: "poem", id: POEM_ID, fromPosition: 3, toPosition: 5 },
      { kind: "poem", id: POEM_ID, fromPosition: 1.5, toPosition: 2 },
      { kind: "poem", id: POEM_ID, fromPosition: 3 },
    ],
    successStatus: "moved",
  },
  {
    name: "removeHomeEntryAction",
    action: removeHomeEntryAction as (input: unknown) => Promise<ActionAnswer>,
    dal: removeHomeEntry as unknown as DalMock,
    input: { kind: "author", id: AUTHOR_PROFILE_ID },
    badInputs: [{ kind: "author", id: "" }, { kind: "other", id: AUTHOR_PROFILE_ID }, { id: AUTHOR_PROFILE_ID }],
    successStatus: "removed",
  },
] as const;

const ALL_DAL_CALLS = ACTIONS.map(({ dal }) => dal);

function expectNoRpcCalled(): void {
  for (const call of ALL_DAL_CALLS) expect(call).not.toHaveBeenCalled();
}

function expectCachesUntouched(): void {
  expect(updateTag).not.toHaveBeenCalled();
  expect(refresh).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: ADMIN_USER_ID });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe.each(ACTIONS)("$name", ({ action, dal, input, badInputs, successStatus }) => {
  // implements FR-8, FR-9, FR-13 of home-page-sections
  it("calls its one function with the validated input, returns the status, and expires the tag once", async () => {
    dal.mockResolvedValue({ ok: true, status: successStatus });

    const result = await action(input);

    expect(result.data).toEqual({ ok: true, status: successStatus });
    expect(dal).toHaveBeenCalledExactlyOnceWith(input);
    for (const other of ALL_DAL_CALLS.filter((call) => call !== dal)) expect(other).not.toHaveBeenCalled();
    expect(updateTag).toHaveBeenCalledExactlyOnceWith(HOME_FEATURED_TAG);
    expect(refresh).toHaveBeenCalledOnce();
  });

  // implements FR-13 of home-page-sections
  it("expires the tag before it refreshes, so the refresh reads the new list", async () => {
    dal.mockResolvedValue({ ok: true, status: successStatus });

    await action(input);

    const tagOrder = vi.mocked(updateTag).mock.invocationCallOrder[0] ?? Number.NaN;
    const refreshOrder = vi.mocked(refresh).mock.invocationCallOrder[0] ?? Number.NaN;
    expect(tagOrder).toBeLessThan(refreshOrder);
  });

  // implements FR-8, FR-9 of home-page-sections
  it.each(badInputs)("returns a validation error and calls no function, nor the session, for %j", async (bad) => {
    const result = await action(bad);

    expect(result.validationErrors).toBeDefined();
    expect(result.data).toBeUndefined();
    expectNoRpcCalled();
    expect(getSessionState).not.toHaveBeenCalled();
    expectCachesUntouched();
  });

  // implements FR-13 of home-page-sections
  it("says the session ended, and writes and expires nothing, when the admin is signed out", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });

    const result = await action(input);

    expect(result.data).toEqual({ ok: false, reason: "unauthenticated" });
    expectNoRpcCalled();
    expectCachesUntouched();
  });

  // implements FR-13 of home-page-sections
  it("says the service is unavailable, not that the session ended, when the session can't be checked", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });

    const result = await action(input);

    expect(result.data).toEqual({ ok: false, reason: "unavailable" });
    expectNoRpcCalled();
    expectCachesUntouched();
  });

  // implements FR-10, FR-13 of home-page-sections
  it.each([
    ["a refused admin check", "forbidden", "forbidden"],
    ["an ended session", "unauthenticated", "unauthenticated"],
    ["an outage", "unavailable", "unavailable"],
    ["a restricted account", "restricted", "unavailable"],
    ["an unknown failure", "unknown", "unavailable"],
  ] as const)("keeps %s apart from the others and expires nothing", async (_case, failure, reason) => {
    dal.mockResolvedValue({ ok: false, failure });

    const result = await action(input);

    expect(result.data).toEqual({ ok: false, reason });
    expect(MODERATION_FAILURE_MESSAGES[reason]).toBeTruthy();
    expectCachesUntouched();
  });

  // implements NFR-6 of home-page-sections
  it("answers an unexpected throw with the generic message, logs the error class only, and expires nothing", async () => {
    dal.mockRejectedValue(new RangeError(`boom for ${TARGET_EMAIL} ${POEM_ID}`));

    const result = await action(input);

    expect(result.serverError).toBe(MODERATION_FAILURE_MESSAGES.unavailable);
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] action failed: RangeError");
    expectNothingSecretLogged();
    expectCachesUntouched();
  });
});

describe("the success log line", () => {
  // implements NFR-6 of home-page-sections
  it.each([
    ["add home poem", () => addHomePoemAction({ poemId: POEM_ID }), addHomePoem, "added"],
    ["add home author", () => addHomeAuthorAction({ authorProfileId: AUTHOR_PROFILE_ID }), addHomeAuthor, "limit-reached"],
    [
      "move home entry",
      () => moveHomeEntryAction({ kind: "poem", id: POEM_ID, fromPosition: 2, toPosition: 1 }),
      moveHomeEntry,
      "stale",
    ],
    ["remove home entry", () => removeHomeEntryAction({ kind: "author", id: AUTHOR_PROFILE_ID }), removeHomeEntry, "removed"],
  ] as const)("leaves one line with the operation and the status only for %s", async (operation, run, dal, status) => {
    (dal as unknown as DalMock).mockResolvedValue({ ok: true, status });

    await run();

    expect(console.info).toHaveBeenCalledExactlyOnceWith(`[admin] ${operation}: ${status}`);
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements NFR-6 of home-page-sections
  it("logs no success line for a failed write, a signed-out admin or a rejected input", async () => {
    vi.mocked(addHomePoem).mockResolvedValue({ ok: false, failure: "forbidden" });
    await addHomePoemAction({ poemId: POEM_ID });

    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });
    await addHomePoemAction({ poemId: POEM_ID });
    await addHomePoemAction({ poemId: "42" });

    expect(console.info).not.toHaveBeenCalled();
  });
});

describe("the add actions, answers that change nothing", () => {
  // implements FR-8, FR-13 of home-page-sections
  it.each(["limit-reached", "already-in-list", "not-found"] as const)(
    "returns %s as a status and expires nothing and refreshes nothing",
    async (status) => {
      vi.mocked(addHomePoem).mockResolvedValue({ ok: true, status });
      vi.mocked(addHomeAuthor).mockResolvedValue({ ok: true, status });

      const poem = await addHomePoemAction({ poemId: POEM_ID });
      const author = await addHomeAuthorAction({ authorProfileId: AUTHOR_PROFILE_ID });

      expect(poem.data).toEqual({ ok: true, status });
      expect(author.data).toEqual({ ok: true, status });
      expectCachesUntouched();
    },
  );
});

describe("the move action, answers that change nothing", () => {
  // implements FR-9, FR-13 of home-page-sections
  it.each(["stale", "not-found"] as const)(
    "returns %s as a status and refreshes without expiring the tag",
    async (status) => {
      vi.mocked(moveHomeEntry).mockResolvedValue({ ok: true, status });

      const result = await moveHomeEntryAction({ kind: "poem", id: POEM_ID, fromPosition: 2, toPosition: 1 });

      expect(result.data).toEqual({ ok: true, status });
      expect(updateTag).not.toHaveBeenCalled();
      expect(refresh).toHaveBeenCalledOnce();
    },
  );
});

describe("the remove action, a repeat", () => {
  // implements FR-9, FR-11, FR-13 of home-page-sections
  it("returns not-found as a status and refreshes without expiring the tag", async () => {
    vi.mocked(removeHomeEntry).mockResolvedValue({ ok: true, status: "not-found" });

    const result = await removeHomeEntryAction({ kind: "author", id: AUTHOR_PROFILE_ID });

    expect(result.data).toEqual({ ok: true, status: "not-found" });
    expect(updateTag).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
