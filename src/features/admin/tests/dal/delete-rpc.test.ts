// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { deleteCollectionAsAdmin, deletePoemAsAdmin } from "../../dal/delete-rpc";
import {
  AUTHOR_ID,
  COLLECTION_ID,
  expectNothingSecretLogged,
  HTTP_FORBIDDEN,
  HTTP_UNAUTHORIZED,
  HTTP_UNAVAILABLE,
  ILLUSTRATION_PATH,
  ok,
  POEM_ID,
  POEM_TITLE,
  rpcError,
  type RpcResponse,
} from "../support/rpc-mock";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

describe("admin deletes", () => {
  let rpc: ReturnType<typeof vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>>;

  beforeEach(() => {
    rpc = vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("deletePoemAsAdmin", () => {
    // implements FR-8 of admin-moderation
    it("returns the author and the illustration path the database gives, sending the poem id only", async () => {
      rpc.mockResolvedValue(ok({ status: "deleted", author_id: AUTHOR_ID, illustration_path: ILLUSTRATION_PATH }));

      await expect(deletePoemAsAdmin({ id: POEM_ID })).resolves.toEqual({
        ok: true,
        status: "deleted",
        authorId: AUTHOR_ID,
        illustrationPath: ILLUSTRATION_PATH,
      });
      expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_delete_poem", { poem_id: POEM_ID });
    });

    // implements FR-8 of admin-moderation
    it("passes a poem without an illustration as a null path", async () => {
      rpc.mockResolvedValue(ok({ status: "deleted", author_id: AUTHOR_ID, illustration_path: null }));

      await expect(deletePoemAsAdmin({ id: POEM_ID })).resolves.toEqual({
        ok: true,
        status: "deleted",
        authorId: AUTHOR_ID,
        illustrationPath: null,
      });
    });

    // implements FR-8 of admin-moderation
    it("passes not-found through without a log line", async () => {
      rpc.mockResolvedValue(ok({ status: "not-found" }));

      await expect(deletePoemAsAdmin({ id: POEM_ID })).resolves.toEqual({ ok: true, status: "not-found" });
      expect(console.error).not.toHaveBeenCalled();
    });

    // implements FR-8, FR-12 of admin-moderation
    it.each([
      ["a refused admin check", rpcError("42501", HTTP_FORBIDDEN), "forbidden"],
      ["an ended session", rpcError("42501", HTTP_UNAUTHORIZED), "unauthenticated"],
      ["an outage", rpcError("XX000", HTTP_UNAVAILABLE), "unavailable"],
    ] as const)("is a failure value for %s, logging no secret", async (_case, response, failure) => {
      rpc.mockResolvedValue(response);

      await expect(deletePoemAsAdmin({ id: POEM_ID })).resolves.toEqual({ ok: false, failure });
      expectNothingSecretLogged();
    });

    // implements FR-8 of admin-moderation
    it.each([
      ["an unknown status", { status: "gone" }],
      ["a deleted answer without an author", { status: "deleted", illustration_path: null }],
      ["a deleted answer with a non-uuid author", { status: "deleted", author_id: POEM_TITLE, illustration_path: null }],
      ["an empty illustration path", { status: "deleted", author_id: AUTHOR_ID, illustration_path: "" }],
      ["no data", null],
    ])("is unknown, never a guessed success, for %s", async (_case, data) => {
      rpc.mockResolvedValue(ok(data));

      await expect(deletePoemAsAdmin({ id: POEM_ID })).resolves.toEqual({ ok: false, failure: "unknown" });
      expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] delete poem failed: ZodError");
      expectNothingSecretLogged();
    });

    // implements NFR-6 of admin-moderation
    it("turns a thrown error into a failure value and logs its class only", async () => {
      rpc.mockRejectedValue(new TypeError("fetch failed"));

      await expect(deletePoemAsAdmin({ id: POEM_ID })).resolves.toEqual({ ok: false, failure: "unavailable" });
      expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] delete poem failed: TypeError");
    });
  });

  describe("deleteCollectionAsAdmin", () => {
    // implements FR-9 of admin-moderation
    it("returns the author and the stored title, sending the collection id only", async () => {
      rpc.mockResolvedValue(ok({ status: "deleted", author_id: AUTHOR_ID, title: POEM_TITLE }));

      await expect(deleteCollectionAsAdmin({ id: COLLECTION_ID })).resolves.toEqual({
        ok: true,
        status: "deleted",
        authorId: AUTHOR_ID,
        title: POEM_TITLE,
      });
      expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_delete_collection", { collection_id: COLLECTION_ID });
    });

    // implements FR-9 of admin-moderation
    it("passes not-found through without a log line", async () => {
      rpc.mockResolvedValue(ok({ status: "not-found" }));

      await expect(deleteCollectionAsAdmin({ id: COLLECTION_ID })).resolves.toEqual({ ok: true, status: "not-found" });
      expect(console.error).not.toHaveBeenCalled();
    });

    // implements FR-9, FR-12 of admin-moderation
    it.each([
      ["a refused admin check", rpcError("42501", HTTP_FORBIDDEN), "forbidden"],
      ["an ended session", rpcError("PGRST301", HTTP_UNAUTHORIZED), "unauthenticated"],
      ["an outage", rpcError("XX000", HTTP_UNAVAILABLE), "unavailable"],
    ] as const)("is a failure value for %s, logging no secret", async (_case, response, failure) => {
      rpc.mockResolvedValue(response);

      await expect(deleteCollectionAsAdmin({ id: COLLECTION_ID })).resolves.toEqual({ ok: false, failure });
      expectNothingSecretLogged();
    });

    // implements FR-9 of admin-moderation
    it.each([
      ["a deleted answer without a title", { status: "deleted", author_id: AUTHOR_ID }],
      ["a deleted answer without an author", { status: "deleted", title: POEM_TITLE }],
      ["an unknown status", { status: "gone" }],
    ])("is unknown, never a guessed success, for %s", async (_case, data) => {
      rpc.mockResolvedValue(ok(data));

      await expect(deleteCollectionAsAdmin({ id: COLLECTION_ID })).resolves.toEqual({
        ok: false,
        failure: "unknown",
      });
      expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] delete collection failed: ZodError");
    });
  });
});
