// @vitest-environment node
import { refresh, updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { deleteCollectionAction } from "../../actions/delete-collection.actions";
import { deleteOwnCollection } from "../../dal/collection-writes";

vi.mock("next/cache", () => ({ refresh: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/collection-writes", () => ({ deleteOwnCollection: vi.fn() }));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const COLLECTION_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const STORED_TITLE = "Осенний цикл";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const OTHER_AUTHOR_ID = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

const DELETED = { ok: true, status: "deleted", title: STORED_TITLE, authorId: AUTHOR_ID } as const;

describe("deleteCollectionAction", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: USER_ID });
    vi.mocked(deleteOwnCollection).mockResolvedValue(DELETED);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-13, FR-15 of add-poem-collections
  it("deletes by id, refreshes, and answers the stored title", async () => {
    const result = await deleteCollectionAction({ collectionId: COLLECTION_ID });

    expect(result.data).toEqual({ status: "deleted", title: STORED_TITLE });
    expect(deleteOwnCollection).toHaveBeenCalledExactlyOnceWith(COLLECTION_ID);
    expect(refresh).toHaveBeenCalledOnce();
  });

  // implements FR-7, NFR-2 of public-collections
  it("expires exactly the deleted collection's author tag, before the refresh", async () => {
    await deleteCollectionAction({ collectionId: COLLECTION_ID });

    expect(updateTag).toHaveBeenCalledExactlyOnceWith(`author-works:${AUTHOR_ID}`);
    expect(refresh).toHaveBeenCalledOnce();
    expect(vi.mocked(updateTag).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(refresh).mock.invocationCallOrder[0] ?? 0);
  });

  // implements FR-7 of public-collections: the delete isn't gated by public status, so the id comes from the database
  it("expires the tag of the author the database returned, with no profile read and not one from the input", async () => {
    vi.mocked(deleteOwnCollection).mockResolvedValue({ ...DELETED, authorId: OTHER_AUTHOR_ID });

    await deleteCollectionAction({ collectionId: COLLECTION_ID, authorId: AUTHOR_ID } as { collectionId: string });

    expect(updateTag).toHaveBeenCalledExactlyOnceWith(`author-works:${OTHER_AUTHOR_ID}`);
  });

  // implements FR-7, NFR-2 of public-collections
  it("logs a failed tag expiry by kind only and still answers deleted", async () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(updateTag).mockImplementationOnce(() => {
      throw new Error(`bad tag author-works:${AUTHOR_ID}`);
    });

    const result = await deleteCollectionAction({ collectionId: COLLECTION_ID });

    expect(result.data).toEqual({ status: "deleted", title: STORED_TITLE });
    expect(logError).toHaveBeenCalledExactlyOnceWith("[collection-management] expire author works tag failed: Error");
    expect(refresh).toHaveBeenCalledOnce();
    logError.mockRestore();
  });

  // implements FR-13 of add-poem-collections
  it("answers the database's title, not one from the input", async () => {
    const result = await deleteCollectionAction({ collectionId: COLLECTION_ID, title: "Чужое" } as { collectionId: string });

    expect(result.data).toEqual({ status: "deleted", title: STORED_TITLE });
  });

  // implements FR-13 of add-poem-collections
  it.each([
    ["an uppercase id", COLLECTION_ID.toUpperCase()],
    ["junk", "abc"],
    ["an empty id", ""],
  ])("answers not-found for %s without any I/O", async (_case, collectionId) => {
    const result = await deleteCollectionAction({ collectionId });

    expect(result.data).toEqual({ status: "not-found" });
    expect(result.validationErrors).toBeUndefined();
    expect(getSessionState).not.toHaveBeenCalled();
    expect(deleteOwnCollection).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  // implements FR-13 of add-poem-collections
  it.each([
    ["signed-out", "unauthenticated"],
    ["unknown", "unavailable"],
  ] as const)("answers a %s session as failed: %s, deleting nothing", async (state, failure) => {
    vi.mocked(getSessionState).mockResolvedValue({ state } as Awaited<ReturnType<typeof getSessionState>>);

    const result = await deleteCollectionAction({ collectionId: COLLECTION_ID });

    expect(result.data).toEqual({ status: "failed", failure });
    expect(deleteOwnCollection).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  // implements FR-13 of add-poem-collections
  it("answers not-found when the collection is already gone, with no refresh", async () => {
    vi.mocked(deleteOwnCollection).mockResolvedValue({ ok: true, status: "not-found" });

    const result = await deleteCollectionAction({ collectionId: COLLECTION_ID });

    expect(result.data).toEqual({ status: "not-found" });
    expect(refresh).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  // implements FR-13 of add-poem-collections
  it.each(["unavailable", "unauthenticated", "unknown"] as const)("passes a classified %s failure through", async (failure) => {
    vi.mocked(deleteOwnCollection).mockResolvedValue({ ok: false, failure });

    const result = await deleteCollectionAction({ collectionId: COLLECTION_ID });

    expect(result.data).toEqual({ status: "failed", failure });
    expect(refresh).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});
