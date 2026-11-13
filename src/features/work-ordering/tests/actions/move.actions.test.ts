// @vitest-environment node
import { refresh, updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { moveCollectionAction } from "../../actions/move-collection.actions";
import { movePoemAction } from "../../actions/move-poem.actions";
import { consumeMoveAllowance } from "../../dal/move-allowance";
import { moveOwnCollection, moveOwnPoem } from "../../dal/move-writes";

vi.mock("next/cache", () => ({ refresh: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/move-allowance", () => ({ consumeMoveAllowance: vi.fn() }));
vi.mock("../../dal/move-writes", () => ({ moveOwnPoem: vi.fn(), moveOwnCollection: vi.fn() }));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const POEM_ID = "1a2b3c4d-0000-4000-8000-000000000001";
const FROM_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const TO_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6e";
const TO_INDEX = 2;

const POEM_INPUT = {
  poemId: POEM_ID,
  from: { kind: "collection", collectionId: FROM_ID },
  to: { kind: "collection", collectionId: TO_ID },
  toIndex: TO_INDEX,
} as const;
const COLLECTION_INPUT = { collectionId: FROM_ID, toIndex: TO_INDEX } as const;

/** Both actions, run through the same steps (design D6): each case below runs against each. */
const ACTIONS = [
  ["movePoemAction", (): ReturnType<typeof movePoemAction> => movePoemAction(POEM_INPUT), moveOwnPoem],
  [
    "moveCollectionAction",
    (): ReturnType<typeof moveCollectionAction> => moveCollectionAction(COLLECTION_INPUT),
    moveOwnCollection,
  ],
] as const;

function expectNothingChanged(): void {
  expect(refresh).not.toHaveBeenCalled();
  expect(updateTag).not.toHaveBeenCalled();
}

describe.each(ACTIONS)("%s", (_name, run, write) => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: USER_ID });
    vi.mocked(consumeMoveAllowance).mockResolvedValue({ ok: true });
    vi.mocked(write).mockResolvedValue({ ok: true, status: "moved", authorId: AUTHOR_ID });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-6, FR-8 of drag-and-drop-ordering
  it("expires exactly the author's public tag the database returned, then refreshes, and answers ok", async () => {
    const result = await run();

    expect(result.data).toEqual({ ok: true });
    expect(updateTag).toHaveBeenCalledExactlyOnceWith(`author-works:${AUTHOR_ID}`);
    expect(refresh).toHaveBeenCalledOnce();
    expect(vi.mocked(updateTag).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(refresh).mock.invocationCallOrder[0] ?? 0,
    );
  });

  // implements NFR-2 of drag-and-drop-ordering
  it("runs the steps in order: session, limit, move", async () => {
    await run();

    const steps = [getSessionState, consumeMoveAllowance, write];
    for (const step of steps) expect(step).toHaveBeenCalledOnce();
    const order = steps.map((mock) => vi.mocked(mock).mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a = 0, b = 0) => a - b));
  });

  // implements FR-6 of drag-and-drop-ordering: the answer is still ok when the tag can't be expired
  it("still answers ok when expiring the tag throws, and logs the error name only", async () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(updateTag).mockImplementationOnce(() => {
      throw new Error("boom");
    });

    const result = await run();

    expect(result.data).toEqual({ ok: true });
    expect(logError).toHaveBeenCalledExactlyOnceWith("[work-ordering] expire author works tag failed: Error");
    expect(refresh).toHaveBeenCalledOnce();
    logError.mockRestore();
  });

  // implements FR-11 of drag-and-drop-ordering
  it.each(["stale", "not-found"] as const)(
    "answers stale and refreshes without expiring anything on %s",
    async (status) => {
      vi.mocked(write).mockResolvedValue({ ok: true, status });

      const result = await run();

      expect(result.data).toEqual({ ok: false, reason: "stale" });
      expect(refresh).toHaveBeenCalledOnce();
      expect(updateTag).not.toHaveBeenCalled();
    },
  );

  // implements FR-6 of drag-and-drop-ordering
  it.each([
    ["signed-out", "unauthenticated"],
    ["unknown", "failed"],
  ] as const)("answers a %s session as %s, counting and writing nothing", async (state, reason) => {
    vi.mocked(getSessionState).mockResolvedValue({ state } as Awaited<ReturnType<typeof getSessionState>>);

    const result = await run();

    expect(result.data).toEqual({ ok: false, reason });
    expect(consumeMoveAllowance).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expectNothingChanged();
  });

  // implements NFR-2 of drag-and-drop-ordering: the thirty-first move
  it("answers rate-limited over the limit, writing and expiring nothing", async () => {
    vi.mocked(consumeMoveAllowance).mockResolvedValue({ ok: false, failure: "too-many-moves" });

    const result = await run();

    expect(result.data).toEqual({ ok: false, reason: "rate-limited" });
    expect(write).not.toHaveBeenCalled();
    expectNothingChanged();
  });

  // implements NFR-2 of drag-and-drop-ordering: the limit check fails closed
  it.each([
    ["unavailable", "failed"],
    ["unknown", "failed"],
    ["unauthenticated", "unauthenticated"],
  ] as const)("answers a limit check that failed (%s) as %s, writing nothing", async (failure, reason) => {
    vi.mocked(consumeMoveAllowance).mockResolvedValue({ ok: false, failure });

    const result = await run();

    expect(result.data).toEqual({ ok: false, reason });
    expect(write).not.toHaveBeenCalled();
    expectNothingChanged();
  });

  // implements FR-6, FR-8 of drag-and-drop-ordering: a failed write expires and refreshes nothing
  it.each([
    ["unavailable", "failed"],
    ["unknown", "failed"],
    ["unauthenticated", "unauthenticated"],
  ] as const)("answers a failed write (%s) as %s, expiring and refreshing nothing", async (failure, reason) => {
    vi.mocked(write).mockResolvedValue({ ok: false, failure });

    const result = await run();

    expect(result.data).toEqual({ ok: false, reason });
    expectNothingChanged();
  });
});

describe("the ids guard", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: USER_ID });
    vi.mocked(consumeMoveAllowance).mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-6 of drag-and-drop-ordering
  it.each([
    ["an uppercase poem id", { ...POEM_INPUT, poemId: POEM_ID.toUpperCase() }],
    ["a junk poem id", { ...POEM_INPUT, poemId: "abc" }],
    ["a junk source collection id", { ...POEM_INPUT, from: { kind: "collection", collectionId: "abc" } }],
    ["an uppercase target collection id", { ...POEM_INPUT, to: { kind: "collection", collectionId: TO_ID.toUpperCase() } }],
  ] as const)("refuses %s with no session check, no count, and no write", async (_case, input) => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await movePoemAction(input);

    expect(result.data).toEqual({ ok: false, reason: "failed" });
    expect(logError).toHaveBeenCalledExactlyOnceWith("[work-ordering] move input rejected");
    logError.mockRestore();
    expect(getSessionState).not.toHaveBeenCalled();
    expect(consumeMoveAllowance).not.toHaveBeenCalled();
    expect(moveOwnPoem).not.toHaveBeenCalled();
    expectNothingChanged();
  });

  // implements FR-6 of drag-and-drop-ordering
  it("refuses a malformed collection id the same way", async () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await moveCollectionAction({ collectionId: "abc", toIndex: 0 });

    expect(result.data).toEqual({ ok: false, reason: "failed" });
    logError.mockRestore();
    expect(consumeMoveAllowance).not.toHaveBeenCalled();
    expect(moveOwnCollection).not.toHaveBeenCalled();
  });

  // implements FR-6 of drag-and-drop-ordering: a wrong shape is the schema's, not a thrown error
  it("answers a wrong shape as a validation error with nothing run", async () => {
    const result = await movePoemAction({ ...POEM_INPUT, toIndex: 1.5 });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(getSessionState).not.toHaveBeenCalled();
    expect(moveOwnPoem).not.toHaveBeenCalled();
  });

  // implements FR-4 of drag-and-drop-ordering: a free list names no collection
  it("passes the free poems through as a list with no collection", async () => {
    vi.mocked(moveOwnPoem).mockResolvedValue({ ok: true, status: "moved", authorId: AUTHOR_ID });
    const input = { poemId: POEM_ID, from: { kind: "free" }, to: { kind: "free" }, toIndex: 0 } as const;

    const result = await movePoemAction(input);

    expect(result.data).toEqual({ ok: true });
    expect(moveOwnPoem).toHaveBeenCalledExactlyOnceWith(input);
  });
});
