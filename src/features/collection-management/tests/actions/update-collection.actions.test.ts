// @vitest-environment node
import { refresh, updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";

import { updateCollectionAction } from "../../actions/update-collection.actions";
import { consumeCollectionEditAllowance } from "../../dal/collection-edit-allowance";
import { updateOwnCollection } from "../../dal/collection-writes";
import { COLLECTION_FIELD_ERRORS } from "../../model/collection-management-messages";

vi.mock("next/cache", () => ({ refresh: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("@/features/authors", () => ({ getOwnPublicAuthor: vi.fn() }));
vi.mock("../../dal/collection-edit-allowance", () => ({ consumeCollectionEditAllowance: vi.fn() }));
vi.mock("../../dal/collection-writes", () => ({ updateOwnCollection: vi.fn() }));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const COLLECTION_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const TITLE = "Осенний цикл 2026";

const INPUT = { collectionId: COLLECTION_ID, title: ` ${TITLE} `, description: "" } as const;

/** Nothing past the step under test ran: no count, no profile read, no update, no refresh. */
function expectNothingCounted(): void {
  expect(consumeCollectionEditAllowance).not.toHaveBeenCalled();
  expect(getOwnPublicAuthor).not.toHaveBeenCalled();
  expect(updateOwnCollection).not.toHaveBeenCalled();
  expect(refresh).not.toHaveBeenCalled();
  expect(updateTag).not.toHaveBeenCalled();
}

describe("updateCollectionAction", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: USER_ID });
    vi.mocked(consumeCollectionEditAllowance).mockResolvedValue({ ok: true });
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "public", authorId: AUTHOR_ID });
    vi.mocked(updateOwnCollection).mockResolvedValue({ ok: true, status: "updated" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-9, FR-15 of add-poem-collections
  it("counts the attempt, saves the normalized values, refreshes, and answers saved", async () => {
    const result = await updateCollectionAction(INPUT);

    expect(result.data).toEqual({ status: "saved" });
    expect(updateOwnCollection).toHaveBeenCalledExactlyOnceWith({
      collectionId: COLLECTION_ID,
      title: TITLE,
      description: null,
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  // implements FR-7, NFR-2 of public-collections
  it("expires exactly the author's public tag, before the refresh, using the id the profile read returned", async () => {
    await updateCollectionAction(INPUT);

    expect(updateTag).toHaveBeenCalledExactlyOnceWith(`author-works:${AUTHOR_ID}`);
    expect(refresh).toHaveBeenCalledOnce();
    expect(vi.mocked(updateTag).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(refresh).mock.invocationCallOrder[0] ?? 0);
  });

  // implements FR-7, NFR-2 of public-collections
  it("still answers saved when expiring the tag throws, and logs only the error name", async () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(updateTag).mockImplementationOnce(() => {
      throw new TypeError(`tag author-works:${AUTHOR_ID}`);
    });

    const result = await updateCollectionAction(INPUT);

    expect(result.data).toEqual({ status: "saved" });
    expect(logError).toHaveBeenCalledExactlyOnceWith("[collection-management] expire author works tag failed: TypeError");
    logError.mockRestore();
    expect(refresh).toHaveBeenCalledOnce();
  });

  // implements FR-10 of add-poem-collections
  it("runs the steps in order: session, limit, profile, update", async () => {
    await updateCollectionAction(INPUT);

    const order = [getSessionState, consumeCollectionEditAllowance, getOwnPublicAuthor, updateOwnCollection].map(
      (mock) => vi.mocked(mock).mock.invocationCallOrder[0] ?? 0,
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  // implements FR-11 of add-poem-collections
  it.each([
    ["an uppercase id", COLLECTION_ID.toUpperCase()],
    ["junk", "abc"],
  ])("answers not-found for %s with no other step", async (_case, collectionId) => {
    const result = await updateCollectionAction({ ...INPUT, collectionId });

    expect(result.data).toEqual({ status: "not-found" });
    expect(result.validationErrors).toBeUndefined();
    expect(getSessionState).not.toHaveBeenCalled();
    expectNothingCounted();
  });

  // implements FR-10 of add-poem-collections
  it("answers invalid input with field errors, counting nothing", async () => {
    const result = await updateCollectionAction({ ...INPUT, title: " " });

    expect(result.data).toEqual({ status: "invalid", fieldErrors: { title: COLLECTION_FIELD_ERRORS.required } });
    expect(getSessionState).not.toHaveBeenCalled();
    expectNothingCounted();
  });

  // implements FR-11 of add-poem-collections
  it.each([
    ["signed-out", "unauthenticated"],
    ["unknown", "unavailable"],
  ] as const)("answers a %s session as failed: %s, counting nothing", async (state, failure) => {
    vi.mocked(getSessionState).mockResolvedValue({ state } as Awaited<ReturnType<typeof getSessionState>>);

    const result = await updateCollectionAction(INPUT);

    expect(result.data).toEqual({ status: "failed", failure });
    expectNothingCounted();
  });

  // implements FR-10 of add-poem-collections
  it.each(["too-many-saves", "unavailable"] as const)("stops at the limit step on %s: no profile read, no update", async (failure) => {
    vi.mocked(consumeCollectionEditAllowance).mockResolvedValue({ ok: false, failure });

    const result = await updateCollectionAction(INPUT);

    expect(result.data).toEqual({ status: "failed", failure });
    expect(getOwnPublicAuthor).not.toHaveBeenCalled();
    expect(updateOwnCollection).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  // implements FR-11 of add-poem-collections
  it("answers a profile no longer public as failed: not-public, with no update", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "not-public" });

    const result = await updateCollectionAction(INPUT);

    expect(result.data).toEqual({ status: "failed", failure: "not-public" });
    expect(updateOwnCollection).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("passes a failed profile read through", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: false, failure: "unavailable" });

    const result = await updateCollectionAction(INPUT);

    expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
    expect(updateOwnCollection).not.toHaveBeenCalled();
  });

  // implements FR-11 of add-poem-collections
  it("answers not-found when the database has no such collection of the caller", async () => {
    vi.mocked(updateOwnCollection).mockResolvedValue({ ok: true, status: "not-found" });

    const result = await updateCollectionAction(INPUT);

    expect(result.data).toEqual({ status: "not-found" });
    expect(refresh).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  // implements FR-11 of add-poem-collections
  it("passes a classified update failure through, with no refresh", async () => {
    vi.mocked(updateOwnCollection).mockResolvedValue({ ok: false, failure: "unavailable" });

    const result = await updateCollectionAction(INPUT);

    expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
    expect(refresh).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});
