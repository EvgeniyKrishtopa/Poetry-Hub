// @vitest-environment node
import { updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { deletePoemAction } from "../../actions/delete-poem.actions";
import { deletePoemAsAdmin } from "../../dal/delete-rpc";
import { removeIllustration } from "../../dal/illustration-cleanup";
import { MODERATION_FAILURE_MESSAGES } from "../../model/admin-messages";
import {
  ADMIN_USER_ID,
  AUTHOR_ID,
  expectNothingSecretLogged,
  ILLUSTRATION_PATH,
  POEM_ID,
  POEM_TITLE,
} from "../support/rpc-mock";

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/delete-rpc", () => ({ deletePoemAsAdmin: vi.fn() }));
vi.mock("../../dal/illustration-cleanup", () => ({ removeIllustration: vi.fn() }));

const OTHER_AUTHOR_ID = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

class StorageApiError extends Error {
  override name = "StorageApiError";
}

const DELETED = { ok: true, status: "deleted", authorId: AUTHOR_ID, illustrationPath: ILLUSTRATION_PATH } as const;

/** Nothing past the validation or the session check ran. */
function expectNothingDone(): void {
  expect(deletePoemAsAdmin).not.toHaveBeenCalled();
  expect(updateTag).not.toHaveBeenCalled();
  expect(removeIllustration).not.toHaveBeenCalled();
}

describe("deletePoemAction", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: ADMIN_USER_ID });
    vi.mocked(deletePoemAsAdmin).mockResolvedValue(DELETED);
    vi.mocked(removeIllustration).mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-8 of admin-moderation
  it("deletes the poem, expires exactly its author's tag, then removes the file", async () => {
    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: true });
    expect(deletePoemAsAdmin).toHaveBeenCalledExactlyOnceWith({ id: POEM_ID });
    expect(updateTag).toHaveBeenCalledExactlyOnceWith(`author-works:${AUTHOR_ID}`);
    expect(removeIllustration).toHaveBeenCalledExactlyOnceWith(ILLUSTRATION_PATH);
    expect(vi.mocked(updateTag).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(removeIllustration).mock.invocationCallOrder[0] ?? 0,
    );
  });

  // implements FR-8 of admin-moderation
  it("expires the tag of the author the database returned, not one from the input", async () => {
    vi.mocked(deletePoemAsAdmin).mockResolvedValue({ ...DELETED, authorId: OTHER_AUTHOR_ID });

    await deletePoemAction({ id: POEM_ID, authorId: AUTHOR_ID } as { id: string });

    expect(updateTag).toHaveBeenCalledExactlyOnceWith(`author-works:${OTHER_AUTHOR_ID}`);
  });

  // implements FR-8 of admin-moderation
  it("removes no file for a poem without an illustration", async () => {
    vi.mocked(deletePoemAsAdmin).mockResolvedValue({ ...DELETED, illustrationPath: null });

    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: true });
    expect(updateTag).toHaveBeenCalledOnce();
    expect(removeIllustration).not.toHaveBeenCalled();
  });

  // implements FR-8, NFR-6 of admin-moderation
  it("keeps the delete when the file removal throws: it still answers success and logs the class only", async () => {
    // The helper never throws by contract; this pins the answer for the day that changes.
    vi.mocked(removeIllustration).mockRejectedValue(new StorageApiError(`object ${ILLUSTRATION_PATH} not found`));

    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: true });
    expect(updateTag).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] remove illustration failed: StorageApiError");
    expectNothingSecretLogged();
  });

  // implements FR-8, NFR-6 of admin-moderation
  it("keeps the delete when the tag expiry throws, logging the class only", async () => {
    vi.mocked(updateTag).mockImplementation(() => {
      throw new RangeError(`not in an action: ${POEM_TITLE} ${AUTHOR_ID}`);
    });

    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: true });
    expect(removeIllustration).toHaveBeenCalledExactlyOnceWith(ILLUSTRATION_PATH);
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] expire author works tag failed: RangeError");
    expectNothingSecretLogged();
  });

  // implements FR-8 of admin-moderation
  it("answers not-found, expiring and removing nothing, for a poem that is gone", async () => {
    vi.mocked(deletePoemAsAdmin).mockResolvedValue({ ok: true, status: "not-found" });

    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: false, reason: "not-found" });
    expect(updateTag).not.toHaveBeenCalled();
    expect(removeIllustration).not.toHaveBeenCalled();
  });

  // implements FR-12 of admin-moderation
  it.each([POEM_ID.toUpperCase(), "not-an-id", ""])("returns a validation error and does nothing for the id %j", async (id) => {
    const result = await deletePoemAction({ id });

    expect(result.validationErrors).toBeDefined();
    expect(getSessionState).not.toHaveBeenCalled();
    expectNothingDone();
  });

  // implements FR-12 of admin-moderation
  it("says the session ended, and does nothing, when the admin is signed out", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });

    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: false, reason: "unauthenticated" });
    expectNothingDone();
  });

  // implements FR-12 of admin-moderation
  it("says the service is unavailable, and does nothing, when the session can't be checked", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });

    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: false, reason: "unavailable" });
    expectNothingDone();
  });

  // implements FR-12 of admin-moderation
  it.each([
    ["a refused admin check", "forbidden", "forbidden"],
    ["an ended session", "unauthenticated", "unauthenticated"],
    ["an outage", "unavailable", "unavailable"],
    ["an unknown failure", "unknown", "unavailable"],
  ] as const)("keeps %s apart, expiring and removing nothing", async (_case, failure, reason) => {
    vi.mocked(deletePoemAsAdmin).mockResolvedValue({ ok: false, failure });

    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.data).toEqual({ ok: false, reason });
    expect(updateTag).not.toHaveBeenCalled();
    expect(removeIllustration).not.toHaveBeenCalled();
  });

  // implements NFR-6 of admin-moderation
  it("answers an unexpected throw with the generic message and logs the action and the error class only", async () => {
    vi.mocked(deletePoemAsAdmin).mockRejectedValue(new RangeError(`boom for ${POEM_TITLE} ${POEM_ID}`));

    const result = await deletePoemAction({ id: POEM_ID });

    expect(result.serverError).toBe(MODERATION_FAILURE_MESSAGES.unavailable);
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] action failed: RangeError");
    expectNothingSecretLogged();
  });
});
