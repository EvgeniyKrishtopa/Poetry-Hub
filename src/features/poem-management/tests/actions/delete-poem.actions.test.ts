// @vitest-environment node
import { updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";

import { deletePoemAction } from "../../actions/delete-poem.actions";
import { removeIllustrationBestEffort } from "../../dal/illustration-cleanup";
import { deleteOwnPoem } from "../../dal/poem-delete";

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("../../dal/poem-delete", () => ({ deleteOwnPoem: vi.fn() }));
vi.mock("../../dal/illustration-cleanup", () => ({ removeIllustrationBestEffort: vi.fn() }));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const OTHER_AUTHOR_ID = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
const POEM_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const ILLUSTRATION_PATH = `${AUTHOR_ID}/0f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f.png`;

const DELETED = { ok: true, status: "deleted", authorId: AUTHOR_ID, illustrationPath: ILLUSTRATION_PATH } as const;

/** Nothing past the guard or the session check ran. */
function expectNoDeleteAttempted(): void {
  expect(deleteOwnPoem).not.toHaveBeenCalled();
  expect(updateTag).not.toHaveBeenCalled();
  expect(removeIllustrationBestEffort).not.toHaveBeenCalled();
}

function loggedText(): string {
  return vi.mocked(console.error).mock.calls.flat().join("\n");
}

describe("deletePoemAction", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: USER_ID });
    vi.mocked(deleteOwnPoem).mockResolvedValue(DELETED);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-3, FR-8 of delete-poem
  it("deletes the poem, expires exactly its author's tag, then removes the file", async () => {
    const result = await deletePoemAction({ poemId: POEM_ID });

    expect(result.data).toEqual({ status: "deleted" });
    expect(deleteOwnPoem).toHaveBeenCalledExactlyOnceWith(POEM_ID);
    expect(updateTag).toHaveBeenCalledExactlyOnceWith(`poems:${AUTHOR_ID}`);
    expect(removeIllustrationBestEffort).toHaveBeenCalledExactlyOnceWith(ILLUSTRATION_PATH);
    expect(vi.mocked(updateTag).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(removeIllustrationBestEffort).mock.invocationCallOrder[0] ?? 0,
    );
  });

  // implements FR-8 of delete-poem
  it("expires the tag of the author the database returned, not one from the input", async () => {
    vi.mocked(deleteOwnPoem).mockResolvedValue({ ...DELETED, authorId: OTHER_AUTHOR_ID });

    await deletePoemAction({ poemId: POEM_ID, authorId: AUTHOR_ID } as { poemId: string });

    expect(updateTag).toHaveBeenCalledExactlyOnceWith(`poems:${OTHER_AUTHOR_ID}`);
  });

  // implements FR-3 of delete-poem
  it("removes no file for a poem without an illustration", async () => {
    vi.mocked(deleteOwnPoem).mockResolvedValue({ ...DELETED, illustrationPath: null });

    const result = await deletePoemAction({ poemId: POEM_ID });

    expect(result.data).toEqual({ status: "deleted" });
    expect(removeIllustrationBestEffort).not.toHaveBeenCalled();
  });

  // implements FR-4 of delete-poem
  it.each([
    ["an uppercase id", POEM_ID.toUpperCase()],
    ["junk", "not-a-uuid"],
    ["an empty id", ""],
  ])("answers not-found for %s without any I/O", async (_case, poemId) => {
    const result = await deletePoemAction({ poemId });

    expect(result.data).toEqual({ status: "not-found" });
    expect(result.validationErrors).toBeUndefined();
    expect(getSessionState).not.toHaveBeenCalled();
    expectNoDeleteAttempted();
  });

  // implements FR-4, FR-8 of delete-poem
  it("passes not-found through and expires no tag", async () => {
    vi.mocked(deleteOwnPoem).mockResolvedValue({ ok: true, status: "not-found" });

    const result = await deletePoemAction({ poemId: POEM_ID });

    expect(result.data).toEqual({ status: "not-found" });
    expect(updateTag).not.toHaveBeenCalled();
    expect(removeIllustrationBestEffort).not.toHaveBeenCalled();
  });

  // implements FR-6 of delete-poem
  it("is unauthenticated when signed out, before any delete", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });

    const result = await deletePoemAction({ poemId: POEM_ID });

    expect(result.data).toEqual({ status: "failed", failure: "unauthenticated" });
    expectNoDeleteAttempted();
  });

  // implements FR-7 of delete-poem
  it("deletes as usual for a session the proxy already refreshed", async () => {
    // The proxy renewed the access token before the action ran, so the session reads as signed in.
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: USER_ID });

    const result = await deletePoemAction({ poemId: POEM_ID });

    expect(result.data).toEqual({ status: "deleted" });
    expect(deleteOwnPoem).toHaveBeenCalledOnce();
  });

  // implements FR-5 of delete-poem
  it("is unavailable when the session can't be checked, before any delete", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });

    const result = await deletePoemAction({ poemId: POEM_ID });

    expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
    expectNoDeleteAttempted();
  });

  // implements FR-5, FR-6, FR-8 of delete-poem
  it.each(["unauthenticated", "unavailable", "unknown"] as const)(
    "returns a %s delete failure as is and expires no tag",
    async (failure) => {
      vi.mocked(deleteOwnPoem).mockResolvedValue({ ok: false, failure });

      const result = await deletePoemAction({ poemId: POEM_ID });

      expect(result.data).toEqual({ status: "failed", failure });
      expect(updateTag).not.toHaveBeenCalled();
      expect(removeIllustrationBestEffort).not.toHaveBeenCalled();
    },
  );

  // A failed file removal never reaches the action: the helper logs it and resolves (illustration-cleanup test).

  // implements FR-3, NFR-5 of delete-poem
  it("logs a failed tag expiry by kind only and still answers deleted", async () => {
    vi.mocked(updateTag).mockImplementation(() => {
      throw new Error(`bad tag poems:${AUTHOR_ID}`);
    });

    const result = await deletePoemAction({ poemId: POEM_ID });

    expect(result.data).toEqual({ status: "deleted" });
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[poem-management] expire poems tag failed: Error");
    expect(removeIllustrationBestEffort).toHaveBeenCalledOnce();
    for (const secret of [POEM_ID, AUTHOR_ID, ILLUSTRATION_PATH, USER_ID]) expect(loggedText()).not.toContain(secret);
  });

  it("rejects a non-string id as a validation error", async () => {
    const result = await deletePoemAction({ poemId: 1 } as unknown as { poemId: string });

    expect(result.validationErrors).toBeDefined();
    expectNoDeleteAttempted();
  });
});
