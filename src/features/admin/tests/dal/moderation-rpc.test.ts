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
  TARGET_EMAIL,
  TARGET_USER_ID,
  type RpcResponse,
} from "../support/rpc-mock";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const INPUT = { userId: TARGET_USER_ID };

/** What block and ban answer besides their status: the address and the open case's ground, in the same transaction. */
const NOTICE_ANSWER = { notice_email: TARGET_EMAIL, ground: "harmful-content" };
const NOTICE_RESULT = { noticeEmail: TARGET_EMAIL, ground: "harmful-content" };

/** Each wrapper with its function, the answers that function may give and what each one becomes (design D2, D3). */
const CALLS = [
  {
    name: "blockUser",
    call: blockUser,
    rpcName: "admin_block_user",
    answers: [
      [{ status: "blocked", ...NOTICE_ANSWER }, { ok: true, status: "blocked", ...NOTICE_RESULT }],
      [{ status: "already-restricted" }, { ok: true, status: "already-restricted" }],
      [{ status: "target-is-admin" }, { ok: true, status: "target-is-admin" }],
      [{ status: "not-found" }, { ok: true, status: "not-found" }],
    ],
    foreignStatus: "unblocked",
  },
  {
    name: "unblockUser",
    call: unblockUser,
    rpcName: "admin_unblock_user",
    answers: [
      [{ status: "unblocked" }, { ok: true, status: "unblocked" }],
      [{ status: "not-blocked" }, { ok: true, status: "not-blocked" }],
    ],
    foreignStatus: "blocked",
  },
  {
    name: "banUser",
    call: banUser,
    rpcName: "admin_ban_user",
    answers: [
      [{ status: "banned", ...NOTICE_ANSWER }, { ok: true, status: "banned", ...NOTICE_RESULT }],
      [{ status: "already-restricted" }, { ok: true, status: "already-restricted" }],
      [{ status: "target-is-admin" }, { ok: true, status: "target-is-admin" }],
      [{ status: "not-found" }, { ok: true, status: "not-found" }],
    ],
    foreignStatus: "not-blocked",
  },
  {
    name: "revokeSessions",
    call: revokeSessions,
    rpcName: "admin_revoke_sessions",
    answers: [
      [{ status: "revoked" }, { ok: true, status: "revoked" }],
      [{ status: "no-sessions" }, { ok: true, status: "no-sessions" }],
      [{ status: "target-is-admin" }, { ok: true, status: "target-is-admin" }],
      [{ status: "not-found" }, { ok: true, status: "not-found" }],
    ],
    foreignStatus: "banned",
  },
] as const;

describe.each(CALLS)("$name", ({ call, rpcName, answers, foreignStatus }) => {
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
  it.each(answers as unknown as readonly (readonly [object, object])[])("calls the function with the target id only and reads the answer %j", async (data, expected) => {
    rpc.mockResolvedValue(ok(data));

    await expect(call(INPUT)).resolves.toEqual(expected);
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

describe.each([
  { name: "blockUser", call: blockUser, done: "blocked" },
  { name: "banUser", call: banUser, done: "banned" },
] as const)("$name's notice data", ({ call, done }) => {
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

  // implements FR-9 of moderation-notifications
  it("passes an account with no address and no open case as two nulls", async () => {
    rpc.mockResolvedValue(ok({ status: done, notice_email: null, ground: null }));

    await expect(call(INPUT)).resolves.toEqual({ ok: true, status: done, noticeEmail: null, ground: null });
  });

  // implements FR-9 of moderation-notifications
  it.each([
    ["no notice_email key", { status: done, ground: null }],
    ["no ground key", { status: done, notice_email: null }],
    ["an empty address", { status: done, notice_email: "", ground: null }],
    ["a ground outside the list", { status: done, notice_email: null, ground: "spam" }],
  ])("is unknown, so a stale database never reads as a send to nobody, for %s", async (_case, data) => {
    rpc.mockResolvedValue(ok(data));

    await expect(call(INPUT)).resolves.toEqual({ ok: false, failure: "unknown" });
    expectNothingSecretLogged();
  });
});
