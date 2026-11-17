// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { banUser, blockUser, revokeSessions, unblockUser } from "../../dal/moderation-rpc";
import {
  expectNothingSecretLogged,
  HTTP_FORBIDDEN,
  HTTP_UNAUTHORIZED,
  HTTP_UNAVAILABLE,
  NO_RESPONSE,
  ok,
  rpcError,
  TARGET_USER_ID,
  type RpcResponse,
} from "../support/rpc-mock";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const INPUT = { userId: TARGET_USER_ID };

/** Each wrapper with its function and the answers that function may give (design D2, tasks 2.5). */
const CALLS = [
  {
    name: "blockUser",
    call: blockUser,
    rpcName: "admin_block_user",
    statuses: ["blocked", "already-restricted", "target-is-admin", "not-found"],
    foreignStatus: "unblocked",
  },
  {
    name: "unblockUser",
    call: unblockUser,
    rpcName: "admin_unblock_user",
    statuses: ["unblocked", "not-blocked"],
    foreignStatus: "blocked",
  },
  {
    name: "banUser",
    call: banUser,
    rpcName: "admin_ban_user",
    statuses: ["banned", "already-restricted", "target-is-admin", "not-found"],
    foreignStatus: "not-blocked",
  },
  {
    name: "revokeSessions",
    call: revokeSessions,
    rpcName: "admin_revoke_sessions",
    statuses: ["revoked", "no-sessions", "target-is-admin", "not-found"],
    foreignStatus: "banned",
  },
] as const;

describe.each(CALLS)("$name", ({ call, rpcName, statuses, foreignStatus }) => {
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

  // implements FR-4, FR-5, FR-6, FR-7 of admin-moderation
  it.each(statuses)("calls %s's function with the target id only and returns the answer %s", async (status) => {
    rpc.mockResolvedValue(ok({ status }));

    await expect(call(INPUT)).resolves.toEqual({ ok: true, status });
    expect(rpc).toHaveBeenCalledExactlyOnceWith(rpcName, { target_user_id: TARGET_USER_ID });
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements FR-12 of admin-moderation
  it.each([
    ["a refused admin check", rpcError("42501", HTTP_FORBIDDEN), "forbidden"],
    ["an ended session", rpcError("PGRST301", HTTP_UNAUTHORIZED), "unauthenticated"],
    ["an outage", rpcError("XX000", HTTP_UNAVAILABLE), "unavailable"],
    ["a network failure", rpcError("", NO_RESPONSE), "unavailable"],
  ] as const)("is a failure value for %s, logging no secret", async (_case, response, failure) => {
    rpc.mockResolvedValue(response);

    await expect(call(INPUT)).resolves.toEqual({ ok: false, failure });
    expect(console.error).toHaveBeenCalledOnce();
    expectNothingSecretLogged();
  });

  // implements FR-12 of admin-moderation
  it.each([
    ["a status another function owns", { status: foreignStatus }],
    ["an unknown status", { status: "gone" }],
    ["no status", {}],
    ["no data", null],
  ])("is unknown, never a guessed success, for %s", async (_case, data) => {
    rpc.mockResolvedValue(ok(data));

    await expect(call(INPUT)).resolves.toEqual({ ok: false, failure: "unknown" });
    expectNothingSecretLogged();
  });

  // implements NFR-6 of admin-moderation
  it("turns a thrown error into a failure value and logs its class only", async () => {
    rpc.mockRejectedValue(new TypeError("fetch failed"));

    await expect(call(INPUT)).resolves.toEqual({ ok: false, failure: "unavailable" });
    expect(console.error).toHaveBeenCalledOnce();
    expect(vi.mocked(console.error).mock.calls[0]?.[0]).toMatch(/^\[admin\] .* failed: TypeError$/);
  });
});
