// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { addHomeAuthor, addHomePoem, listHomeEntries, moveHomeEntry, removeHomeEntry } from "../../dal/home-rpc";
import {
  AUTHOR_PROFILE_ID,
  expectNothingSecretLogged,
  HTTP_FORBIDDEN,
  HTTP_UNAUTHORIZED,
  HTTP_UNAVAILABLE,
  NO_RESPONSE,
  ok,
  POEM_ID,
  rpcError,
  type RpcResponse,
} from "../support/rpc-mock";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

type RpcMock = ReturnType<typeof vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>>;

const FORBIDDEN_CODE = "42501";
const OUTAGE_CODE = "PGRST000";

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: "poem",
    id: POEM_ID,
    entry_position: 1,
    shown: true,
    label: "Секрет",
    author_name: "Ада Лавлейс",
    ...overrides,
  };
}

describe("home-rpc", () => {
  let rpc: RpcMock;

  beforeEach(() => {
    rpc = vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("addHomePoem and addHomeAuthor", () => {
    // implements FR-8 of home-page-sections
    it("sends the poem id and reads the answer", async () => {
      rpc.mockResolvedValue(ok({ status: "added" }));

      await expect(addHomePoem({ poemId: POEM_ID })).resolves.toEqual({ ok: true, status: "added" });
      expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_add_home_poem", { poem_id: POEM_ID });
    });

    // implements FR-8 of home-page-sections
    it("sends the author's profile id and reads the answer", async () => {
      rpc.mockResolvedValue(ok({ status: "already-in-list" }));

      await expect(addHomeAuthor({ authorProfileId: AUTHOR_PROFILE_ID })).resolves.toEqual({
        ok: true,
        status: "already-in-list",
      });
      expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_add_home_author", { author_profile_id: AUTHOR_PROFILE_ID });
    });

    // implements FR-8 of home-page-sections
    it.each(["added", "limit-reached", "already-in-list", "not-found"])("returns the answer %s", async (status) => {
      rpc.mockResolvedValue(ok({ status }));

      await expect(addHomePoem({ poemId: POEM_ID })).resolves.toEqual({ ok: true, status });
      expect(console.error).not.toHaveBeenCalled();
    });

    // implements FR-8 of home-page-sections
    it.each(["moved", "stale", "removed", "ready", ""])("treats the foreign status %j as a failure", async (status) => {
      rpc.mockResolvedValue(ok({ status }));

      await expect(addHomePoem({ poemId: POEM_ID })).resolves.toEqual({ ok: false, failure: "unknown" });
    });
  });

  describe("moveHomeEntry", () => {
    // implements FR-9 of home-page-sections
    it("sends the kind, the id and both places, and reads the answer", async () => {
      rpc.mockResolvedValue(ok({ status: "moved" }));

      await expect(
        moveHomeEntry({ kind: "poem", id: POEM_ID, fromPosition: 3, toPosition: 1 }),
      ).resolves.toEqual({ ok: true, status: "moved" });
      expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_move_home_entry", {
        kind: "poem",
        id: POEM_ID,
        from_position: 3,
        to_position: 1,
      });
    });

    // implements FR-9 of home-page-sections
    it.each(["moved", "stale", "not-found"])("returns the answer %s", async (status) => {
      rpc.mockResolvedValue(ok({ status }));

      await expect(
        moveHomeEntry({ kind: "author", id: AUTHOR_PROFILE_ID, fromPosition: 1, toPosition: 2 }),
      ).resolves.toEqual({ ok: true, status });
    });

    // implements FR-9 of home-page-sections
    it("refuses an answer that is not a move status", async () => {
      rpc.mockResolvedValue(ok({ status: "limit-reached" }));

      await expect(
        moveHomeEntry({ kind: "poem", id: POEM_ID, fromPosition: 1, toPosition: 2 }),
      ).resolves.toEqual({ ok: false, failure: "unknown" });
    });
  });

  describe("removeHomeEntry", () => {
    // implements FR-9, FR-11 of home-page-sections
    it("sends the kind and the id, and reads removed and not-found", async () => {
      rpc.mockResolvedValueOnce(ok({ status: "removed" }));
      rpc.mockResolvedValueOnce(ok({ status: "not-found" }));

      await expect(removeHomeEntry({ kind: "poem", id: POEM_ID })).resolves.toEqual({ ok: true, status: "removed" });
      await expect(removeHomeEntry({ kind: "poem", id: POEM_ID })).resolves.toEqual({ ok: true, status: "not-found" });
      expect(rpc).toHaveBeenNthCalledWith(1, "admin_remove_home_entry", { kind: "poem", id: POEM_ID });
    });

    // implements FR-9 of home-page-sections
    it("refuses an answer that is not a remove status", async () => {
      rpc.mockResolvedValue(ok({ status: "stale" }));

      await expect(removeHomeEntry({ kind: "poem", id: POEM_ID })).resolves.toEqual({ ok: false, failure: "unknown" });
    });
  });

  describe("listHomeEntries", () => {
    // implements FR-9, FR-11 of home-page-sections
    it("splits the rows into the poem list and the author list, keeping each one's order", async () => {
      rpc.mockResolvedValue(
        ok([
          row({ id: POEM_ID, entry_position: 1 }),
          row({ id: "11111111-2222-4333-8444-555555555555", entry_position: 2, label: "Другое", shown: false }),
          row({ kind: "author", id: AUTHOR_PROFILE_ID, entry_position: 1, label: "Ада Лавлейс", author_name: null }),
        ]),
      );

      const result = await listHomeEntries();

      expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_list_home_entries", {});
      expect(result).toEqual({
        ok: true,
        poems: [
          { kind: "poem", id: POEM_ID, position: 1, shown: true, label: "Секрет", authorName: "Ада Лавлейс" },
          {
            kind: "poem",
            id: "11111111-2222-4333-8444-555555555555",
            position: 2,
            shown: false,
            label: "Другое",
            authorName: "Ада Лавлейс",
          },
        ],
        authors: [
          { kind: "author", id: AUTHOR_PROFILE_ID, position: 1, shown: true, label: "Ада Лавлейс", authorName: null },
        ],
      });
    });

    // implements FR-9 of home-page-sections
    it("answers two empty lists for an empty table", async () => {
      rpc.mockResolvedValue(ok([]));

      await expect(listHomeEntries()).resolves.toEqual({ ok: true, poems: [], authors: [] });
    });

    // implements FR-9 of home-page-sections
    it.each([
      ["a row of an unknown kind", [row({ kind: "collection" })]],
      ["a row with a non-uuid id", [row({ id: "42" })]],
      ["a row with no position", [row({ entry_position: 0 })]],
      ["an answer that is not a list", { status: "added" }],
    ])("reads %s as a failure", async (_case, data) => {
      rpc.mockResolvedValue(ok(data));

      await expect(listHomeEntries()).resolves.toEqual({ ok: false, failure: "unknown" });
    });
  });

  describe("failures", () => {
    // implements FR-10, NFR-6 of home-page-sections
    it("reads 42501 as forbidden", async () => {
      rpc.mockResolvedValue(rpcError(FORBIDDEN_CODE, HTTP_FORBIDDEN));

      await expect(addHomePoem({ poemId: POEM_ID })).resolves.toEqual({ ok: false, failure: "forbidden" });
      await expect(listHomeEntries()).resolves.toEqual({ ok: false, failure: "forbidden" });
    });

    // implements FR-8 of home-page-sections
    it("reads an ended session as unauthenticated, not as forbidden", async () => {
      rpc.mockResolvedValue(rpcError(FORBIDDEN_CODE, HTTP_UNAUTHORIZED));

      await expect(addHomePoem({ poemId: POEM_ID })).resolves.toEqual({ ok: false, failure: "unauthenticated" });
    });

    // implements FR-8 of home-page-sections
    it.each([HTTP_UNAVAILABLE, NO_RESPONSE])("reads an outage with status %i as unavailable", async (status) => {
      rpc.mockResolvedValue(rpcError(OUTAGE_CODE, status));

      await expect(moveHomeEntry({ kind: "poem", id: POEM_ID, fromPosition: 1, toPosition: 2 })).resolves.toEqual({
        ok: false,
        failure: "unavailable",
      });
    });

    // implements FR-8 of home-page-sections
    it("turns a throw into a failure value", async () => {
      rpc.mockRejectedValue(new TypeError("fetch failed"));

      await expect(removeHomeEntry({ kind: "poem", id: POEM_ID })).resolves.toEqual({ ok: false, failure: "unavailable" });
    });

    // implements NFR-6 of home-page-sections
    it("logs the operation and the failure kind only, never an id, a title or a message", async () => {
      rpc.mockResolvedValue(rpcError(FORBIDDEN_CODE, HTTP_FORBIDDEN));

      await addHomePoem({ poemId: POEM_ID });

      expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] add home poem failed: PostgrestError 42501");
      expectNothingSecretLogged();
    });

    // implements NFR-6 of home-page-sections
    it("logs a refused answer by its kind, without the answer", async () => {
      rpc.mockResolvedValue(ok({ status: "ready", note: POEM_ID }));

      await addHomePoem({ poemId: POEM_ID });

      expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] add home poem failed: ZodError");
      expectNothingSecretLogged();
    });
  });
});
