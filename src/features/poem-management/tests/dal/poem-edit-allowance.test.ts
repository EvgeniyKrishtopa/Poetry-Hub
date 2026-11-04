// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { consumePoemEditAllowance } from "../../dal/poem-edit-allowance";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const FUNCTION_NAME = "consume_write_allowance";
const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const HTTP_UNAVAILABLE = 503;

interface RpcResponse {
  readonly data: unknown;
  readonly error: unknown;
  readonly status: number;
}

function ok(data: unknown): RpcResponse {
  return { data, error: null, status: HTTP_OK };
}

function rpcError(code: string, status: number): RpcResponse {
  return { data: null, error: { code, message: "details the log must not quote" }, status };
}

describe("consumePoemEditAllowance", () => {
  let rpc: ReturnType<typeof vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>>;

  beforeEach(() => {
    rpc = vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-7 of edit-poem
  it("lets an attempt within the limit through, sending only the poem_edit scope", async () => {
    rpc.mockResolvedValue(ok(true));

    await expect(consumePoemEditAllowance()).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledExactlyOnceWith(FUNCTION_NAME, { scope: "poem_edit" });
    expect(console.warn).not.toHaveBeenCalled();
  });

  // implements FR-7 of edit-poem
  it("refuses an attempt over the limit as too-many-saves, logged as a warning only", async () => {
    rpc.mockResolvedValue(ok(false));

    await expect(consumePoemEditAllowance()).resolves.toEqual({ ok: false, failure: "too-many-saves" });
    expect(console.warn).toHaveBeenCalledExactlyOnceWith("[poem-management] edit limit reached");
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements FR-7 of edit-poem
  it.each([
    ["a 5xx", rpcError("XX000", HTTP_UNAVAILABLE), "unavailable"],
    ["a rejected JWT", rpcError("PGRST301", HTTP_UNAUTHORIZED), "unauthenticated"],
  ] as const)("classifies %s", async (_case, response, failure) => {
    rpc.mockResolvedValue(response);

    await expect(consumePoemEditAllowance()).resolves.toEqual({ ok: false, failure });
    expect(console.error).toHaveBeenCalledOnce();
    expect(String(vi.mocked(console.error).mock.calls[0]?.[0])).not.toContain("details");
  });

  // implements FR-7 of edit-poem
  it.each([
    ["no data", null],
    ["a string", "true"],
    ["a number", 1],
  ])("fails closed as unknown on %s instead of a boolean", async (_case, data) => {
    rpc.mockResolvedValue(ok(data));

    await expect(consumePoemEditAllowance()).resolves.toEqual({ ok: false, failure: "unknown" });
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[poem-management] check edit limit failed: ZodError");
  });

  it("maps a missing Supabase config to unavailable without throwing", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

    await expect(consumePoemEditAllowance()).resolves.toEqual({ ok: false, failure: "unavailable" });
  });

  it("maps a thrown network failure to unavailable", async () => {
    rpc.mockRejectedValue(new TypeError("fetch failed"));

    await expect(consumePoemEditAllowance()).resolves.toEqual({ ok: false, failure: "unavailable" });
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[poem-management] check edit limit failed: TypeError");
  });
});
