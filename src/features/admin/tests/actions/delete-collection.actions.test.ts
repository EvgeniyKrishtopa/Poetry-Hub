// @vitest-environment node
import { updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { deleteCollectionAction } from "../../actions/delete-collection.actions";
import { deleteCollectionAsAdmin } from "../../dal/delete-rpc";
import { MODERATION_FAILURE_MESSAGES } from "../../model/admin-messages";
import { ADMIN_USER_ID, AUTHOR_ID, COLLECTION_ID, expectNothingSecretLogged, POEM_TITLE } from "../support/rpc-mock";

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/delete-rpc", () => ({ deleteCollectionAsAdmin: vi.fn() }));

const DELETED = { ok: true, status: "deleted", authorId: AUTHOR_ID, title: POEM_TITLE } as const;

describe("deleteCollectionAction", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: ADMIN_USER_ID });
    vi.mocked(deleteCollectionAsAdmin).mockResolvedValue(DELETED);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-9 of admin-moderation
  it("deletes the collection and expires exactly its author's tag, returning no title", async () => {
    const result = await deleteCollectionAction({ id: COLLECTION_ID });

    expect(result.data).toEqual({ ok: true });
    expect(deleteCollectionAsAdmin).toHaveBeenCalledExactlyOnceWith({ id: COLLECTION_ID });
    expect(updateTag).toHaveBeenCalledExactlyOnceWith(`author-works:${AUTHOR_ID}`);
  });

  // implements FR-9, NFR-6 of admin-moderation
  it("keeps the delete when the tag expiry throws, logging the class only", async () => {
    vi.mocked(updateTag).mockImplementation(() => {
      throw new RangeError(`not in an action: ${POEM_TITLE}`);
    });

    const result = await deleteCollectionAction({ id: COLLECTION_ID });

    expect(result.data).toEqual({ ok: true });
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] expire author works tag failed: RangeError");
    expectNothingSecretLogged();
  });

  // implements FR-9 of admin-moderation
  it("answers not-found, expiring nothing, for a collection that is gone", async () => {
    vi.mocked(deleteCollectionAsAdmin).mockResolvedValue({ ok: true, status: "not-found" });

    const result = await deleteCollectionAction({ id: COLLECTION_ID });

    expect(result.data).toEqual({ ok: false, reason: "not-found" });
    expect(updateTag).not.toHaveBeenCalled();
  });

  // implements FR-12 of admin-moderation
  it.each([COLLECTION_ID.toUpperCase(), "not-an-id", ""])(
    "returns a validation error and does nothing for the id %j",
    async (id) => {
      const result = await deleteCollectionAction({ id });

      expect(result.validationErrors).toBeDefined();
      expect(getSessionState).not.toHaveBeenCalled();
      expect(deleteCollectionAsAdmin).not.toHaveBeenCalled();
      expect(updateTag).not.toHaveBeenCalled();
    },
  );

  // implements FR-12 of admin-moderation
  it.each([
    ["signed-out", "unauthenticated"],
    ["unknown", "unavailable"],
  ] as const)("calls nothing and answers %s as %s when the session is not usable", async (state, reason) => {
    vi.mocked(getSessionState).mockResolvedValue({ state });

    const result = await deleteCollectionAction({ id: COLLECTION_ID });

    expect(result.data).toEqual({ ok: false, reason });
    expect(deleteCollectionAsAdmin).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  // implements FR-12 of admin-moderation
  it.each([
    ["a refused admin check", "forbidden", "forbidden"],
    ["an ended session", "unauthenticated", "unauthenticated"],
    ["an outage", "unavailable", "unavailable"],
    ["an unknown failure", "unknown", "unavailable"],
  ] as const)("keeps %s apart, expiring nothing", async (_case, failure, reason) => {
    vi.mocked(deleteCollectionAsAdmin).mockResolvedValue({ ok: false, failure });

    const result = await deleteCollectionAction({ id: COLLECTION_ID });

    expect(result.data).toEqual({ ok: false, reason });
    expect(updateTag).not.toHaveBeenCalled();
  });

  // implements NFR-6 of admin-moderation
  it("answers an unexpected throw with the generic message and logs the action and the error class only", async () => {
    vi.mocked(deleteCollectionAsAdmin).mockRejectedValue(new RangeError(`boom for ${POEM_TITLE}`));

    const result = await deleteCollectionAction({ id: COLLECTION_ID });

    expect(result.serverError).toBe(MODERATION_FAILURE_MESSAGES.unavailable);
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] action failed: RangeError");
    expectNothingSecretLogged();
  });
});
