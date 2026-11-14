// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { checkIsAdmin, checkMayModerateAuthor } from "../../dal/admin-check";
import {
  AUTHOR_ID,
  expectNothingSecretLogged,
  HTTP_FORBIDDEN,
  HTTP_UNAUTHORIZED,
  HTTP_UNAVAILABLE,
  NO_RESPONSE,
  ok,
  rpcError,
  type RpcResponse,
} from "../support/rpc-mock";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

describe("admin checks", () => {
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

  describe("checkIsAdmin", () => {
    // implements FR-2 of admin-moderation
    it.each([true, false])("answers %s as the caller's own admin flag, calling the function with no argument", async (isAdmin) => {
      rpc.mockResolvedValue(ok(isAdmin));

      await expect(checkIsAdmin()).resolves.toEqual({ ok: true, isAdmin });
      expect(rpc).toHaveBeenCalledExactlyOnceWith("is_admin");
    });

    // implements FR-2 of admin-moderation
    it.each([
      ["an outage (5xx)", rpcError("XX000", HTTP_UNAVAILABLE), "unavailable"],
      ["a network failure", rpcError("", NO_RESPONSE), "unavailable"],
      ["a gone session (401)", rpcError("42501", HTTP_UNAUTHORIZED), "unauthenticated"],
      ["a refused call (403)", rpcError("42501", HTTP_FORBIDDEN), "forbidden"],
    ] as const)("is a failure, never `not an admin`, for %s", async (_case, response, failure) => {
      rpc.mockResolvedValue(response);

      await expect(checkIsAdmin()).resolves.toEqual({ ok: false, failure });
      expectNothingSecretLogged();
    });

    // implements FR-2 of admin-moderation
    it.each([
      ["a string", "true"],
      ["a number", 1],
      ["no data", null],
    ])("is unknown, not a guess, for %s", async (_case, data) => {
      rpc.mockResolvedValue(ok(data));

      await expect(checkIsAdmin()).resolves.toEqual({ ok: false, failure: "unknown" });
    });

    // implements FR-2 of admin-moderation
    it("is a failure value when the client can't be built or the call throws", async () => {
      vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));
      await expect(checkIsAdmin()).resolves.toEqual({ ok: false, failure: "unavailable" });

      vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as unknown as SupabaseClient);
      rpc.mockRejectedValue(new TypeError("fetch failed"));
      await expect(checkIsAdmin()).resolves.toEqual({ ok: false, failure: "unavailable" });
    });
  });

  describe("checkMayModerateAuthor", () => {
    // implements FR-10 of admin-moderation
    it.each([true, false])("answers %s and sends only the profile id", async (mayModerate) => {
      rpc.mockResolvedValue(ok(mayModerate));

      await expect(checkMayModerateAuthor(AUTHOR_ID)).resolves.toEqual({ ok: true, mayModerate });
      expect(rpc).toHaveBeenCalledExactlyOnceWith("may_moderate_author", { author_profile_id: AUTHOR_ID });
    });

    // implements FR-10 of admin-moderation
    it("is a failure, not `false`, for an outage, so the page can tell them apart", async () => {
      rpc.mockResolvedValue(rpcError("XX000", HTTP_UNAVAILABLE));

      await expect(checkMayModerateAuthor(AUTHOR_ID)).resolves.toEqual({ ok: false, failure: "unavailable" });
      expectNothingSecretLogged();
    });

    // implements FR-10 of admin-moderation
    it("is unknown for an answer that is not a boolean", async () => {
      rpc.mockResolvedValue(ok({ allowed: true }));

      await expect(checkMayModerateAuthor(AUTHOR_ID)).resolves.toEqual({ ok: false, failure: "unknown" });
    });
  });
});
