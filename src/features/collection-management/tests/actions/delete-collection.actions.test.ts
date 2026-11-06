// @vitest-environment node
import { refresh } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { deleteCollectionAction } from "../../actions/delete-collection.actions";
import { deleteOwnCollection } from "../../dal/collection-writes";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/collection-writes", () => ({ deleteOwnCollection: vi.fn() }));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const COLLECTION_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const STORED_TITLE = "Осенний цикл";

describe("deleteCollectionAction", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: USER_ID });
    vi.mocked(deleteOwnCollection).mockResolvedValue({ ok: true, status: "deleted", title: STORED_TITLE });
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
  });

  // implements FR-13 of add-poem-collections
  it("answers not-found when the collection is already gone, with no refresh", async () => {
    vi.mocked(deleteOwnCollection).mockResolvedValue({ ok: true, status: "not-found" });

    const result = await deleteCollectionAction({ collectionId: COLLECTION_ID });

    expect(result.data).toEqual({ status: "not-found" });
    expect(refresh).not.toHaveBeenCalled();
  });

  // implements FR-13 of add-poem-collections
  it.each(["unavailable", "unauthenticated", "unknown"] as const)("passes a classified %s failure through", async (failure) => {
    vi.mocked(deleteOwnCollection).mockResolvedValue({ ok: false, failure });

    const result = await deleteCollectionAction({ collectionId: COLLECTION_ID });

    expect(result.data).toEqual({ status: "failed", failure });
    expect(refresh).not.toHaveBeenCalled();
  });
});
