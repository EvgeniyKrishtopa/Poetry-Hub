// @vitest-environment node
import { refresh, updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";

import { saveCollectionPoemsAction } from "../../actions/save-collection-poems.actions";
import { consumeCollectionPoemsSaveAllowance } from "../../dal/collection-poems-allowance";
import { saveOwnCollectionPoems } from "../../dal/collection-poems-writes";
import type { SaveCollectionPoemsInput } from "../../model/collection-poems.schema";

vi.mock("next/cache", () => ({ refresh: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("@/features/authors", () => ({ getOwnPublicAuthor: vi.fn() }));
vi.mock("../../dal/collection-poems-allowance", () => ({ consumeCollectionPoemsSaveAllowance: vi.fn() }));
vi.mock("../../dal/collection-poems-writes", () => ({ saveOwnCollectionPoems: vi.fn() }));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const COLLECTION_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const ADDED_ID = "1a2b3c4d-0000-4000-8000-000000000001";
const REMOVED_ID = "1a2b3c4d-0000-4000-8000-000000000002";

const INPUT: SaveCollectionPoemsInput = { collectionId: COLLECTION_ID, added: [ADDED_ID], removed: [REMOVED_ID] };

/** Nothing past the step under test ran: no count, no profile read, no save, no refresh. */
function expectNothingCounted(): void {
  expect(consumeCollectionPoemsSaveAllowance).not.toHaveBeenCalled();
  expect(getOwnPublicAuthor).not.toHaveBeenCalled();
  expect(saveOwnCollectionPoems).not.toHaveBeenCalled();
  expect(refresh).not.toHaveBeenCalled();
  expect(updateTag).not.toHaveBeenCalled();
}

describe("saveCollectionPoemsAction", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: USER_ID });
    vi.mocked(consumeCollectionPoemsSaveAllowance).mockResolvedValue({ ok: true });
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "public", authorId: AUTHOR_ID });
    vi.mocked(saveOwnCollectionPoems).mockResolvedValue({ ok: true, status: "saved" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-6, FR-12 of add-poems-to-collections
  it("counts the attempt, saves both lists, refreshes, and answers saved", async () => {
    const result = await saveCollectionPoemsAction(INPUT);

    expect(result.data).toEqual({ status: "saved" });
    expect(saveOwnCollectionPoems).toHaveBeenCalledExactlyOnceWith({
      collectionId: COLLECTION_ID,
      added: [ADDED_ID],
      removed: [REMOVED_ID],
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  // implements FR-7 of add-poems-to-collections
  it("runs the steps in order: session, limit, profile, save", async () => {
    await saveCollectionPoemsAction(INPUT);

    const steps = [getSessionState, consumeCollectionPoemsSaveAllowance, getOwnPublicAuthor, saveOwnCollectionPoems];
    for (const step of steps) expect(step).toHaveBeenCalledOnce();
    const order = steps.map((mock) => vi.mocked(mock).mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a = 0, b = 0) => a - b));
  });

  // implements FR-8 of add-poems-to-collections
  it.each([
    ["an uppercase id", COLLECTION_ID.toUpperCase()],
    ["junk", "abc"],
  ])("answers not-found for %s with no other step", async (_case, collectionId) => {
    const result = await saveCollectionPoemsAction({ ...INPUT, collectionId });

    expect(result.data).toEqual({ status: "not-found" });
    expect(getSessionState).not.toHaveBeenCalled();
    expectNothingCounted();
  });

  // implements FR-7 of add-poems-to-collections
  it.each([
    ["both lists empty", [], []],
    ["a non-UUID poem id", ["poem-1"], []],
    ["a duplicate", [ADDED_ID, ADDED_ID], []],
    ["one poem both added and removed", [ADDED_ID], [ADDED_ID]],
  ])("answers %s as failed: unknown, counting nothing", async (_case, added, removed) => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await saveCollectionPoemsAction({ collectionId: COLLECTION_ID, added, removed });

    expect(result.data).toEqual({ status: "failed", failure: "unknown" });
    expect(result.validationErrors).toBeUndefined();
    // implements NFR-5 of add-poems-to-collections
    expect(logError).toHaveBeenCalledExactlyOnceWith("[collection-management] save collection poems input rejected");
    logError.mockRestore();
    expect(getSessionState).not.toHaveBeenCalled();
    expectNothingCounted();
  });

  // implements FR-8 of add-poems-to-collections
  it.each([
    ["signed-out", "unauthenticated"],
    ["unknown", "unavailable"],
  ] as const)("answers a %s session as failed: %s, counting nothing", async (state, failure) => {
    vi.mocked(getSessionState).mockResolvedValue({ state } as Awaited<ReturnType<typeof getSessionState>>);

    const result = await saveCollectionPoemsAction(INPUT);

    expect(result.data).toEqual({ status: "failed", failure });
    expectNothingCounted();
  });

  // implements FR-7 of add-poems-to-collections
  it.each(["too-many-saves", "unavailable"] as const)("stops at the limit step on %s: no profile read, no save", async (failure) => {
    vi.mocked(consumeCollectionPoemsSaveAllowance).mockResolvedValue({ ok: false, failure });

    const result = await saveCollectionPoemsAction(INPUT);

    expect(result.data).toEqual({ status: "failed", failure });
    expect(getOwnPublicAuthor).not.toHaveBeenCalled();
    expect(saveOwnCollectionPoems).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  // implements FR-8 of add-poems-to-collections
  it("answers a profile no longer public as failed: not-public, with no save", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "not-public" });

    const result = await saveCollectionPoemsAction(INPUT);

    expect(result.data).toEqual({ status: "failed", failure: "not-public" });
    expect(saveOwnCollectionPoems).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("passes a failed profile read through", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: false, failure: "unavailable" });

    const result = await saveCollectionPoemsAction(INPUT);

    expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
    expect(saveOwnCollectionPoems).not.toHaveBeenCalled();
  });

  // implements FR-8, FR-12 of add-poems-to-collections
  it("refreshes on stale too, so the page shows the poems as they are now", async () => {
    vi.mocked(saveOwnCollectionPoems).mockResolvedValue({ ok: true, status: "stale" });

    const result = await saveCollectionPoemsAction(INPUT);

    expect(result.data).toEqual({ status: "stale" });
    expect(refresh).toHaveBeenCalledOnce();
    // implements FR-7 of public-collections: nothing was written, so the public tag stays
    expect(updateTag).not.toHaveBeenCalled();
  });

  // implements FR-7, NFR-2 of public-collections
  it("expires exactly the author's public tag after saved, using the id the profile read returned", async () => {
    await saveCollectionPoemsAction(INPUT);

    expect(updateTag).toHaveBeenCalledExactlyOnceWith(`author-works:${AUTHOR_ID}`);
    expect(vi.mocked(updateTag).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(refresh).mock.invocationCallOrder[0] ?? 0);
  });

  // implements FR-7, NFR-2 of public-collections
  it("still answers saved when expiring the tag throws", async () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(updateTag).mockImplementationOnce(() => {
      throw new Error("boom");
    });

    const result = await saveCollectionPoemsAction(INPUT);

    expect(result.data).toEqual({ status: "saved" });
    expect(logError).toHaveBeenCalledExactlyOnceWith("[collection-management] expire author works tag failed: Error");
    logError.mockRestore();
  });

  // implements FR-8 of add-poems-to-collections
  it("answers not-found when the database has no such collection of the caller, with no refresh", async () => {
    vi.mocked(saveOwnCollectionPoems).mockResolvedValue({ ok: true, status: "not-found" });

    const result = await saveCollectionPoemsAction(INPUT);

    expect(result.data).toEqual({ status: "not-found" });
    expect(refresh).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  // implements FR-8 of add-poems-to-collections
  it.each(["unavailable", "unauthenticated", "unknown"] as const)(
    "passes a classified save failure (%s) through, with no refresh",
    async (failure) => {
      vi.mocked(saveOwnCollectionPoems).mockResolvedValue({ ok: false, failure });

      const result = await saveCollectionPoemsAction(INPUT);

      expect(result.data).toEqual({ status: "failed", failure });
      expect(refresh).not.toHaveBeenCalled();
      expect(updateTag).not.toHaveBeenCalled();
    },
  );
});
