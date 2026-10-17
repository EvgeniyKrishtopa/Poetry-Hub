// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { consumeWriteAllowance } from "../../dal/write-allowance";
import { WRITE_SCOPES } from "../../model/author.constants";

import { createFakeSupabase, errorResponse, okResponse, type FakeSupabase } from "./fake-supabase";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const FUNCTION_NAME = "consume_write_allowance";
const HTTP_UNAUTHORIZED = 401;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVICE_UNAVAILABLE = 503;

let supabase: FakeSupabase;

describe("consumeWriteAllowance", () => {
  beforeEach(() => {
    supabase = createFakeSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase.client);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-21, NFR-2 of add-author-profiles
  it("sends only the scope to the database function, which holds the limits", async () => {
    supabase.onRpc(FUNCTION_NAME, okResponse(true));

    await consumeWriteAllowance(WRITE_SCOPES.profileWrite);

    expect(supabase.rpc).toHaveBeenCalledExactlyOnceWith(FUNCTION_NAME, { scope: "profile_write" });
  });

  // implements FR-21 of add-author-profiles
  it("lets an attempt within the limit through", async () => {
    supabase.onRpc(FUNCTION_NAME, okResponse(true));

    await expect(consumeWriteAllowance(WRITE_SCOPES.photoUpload)).resolves.toEqual({ ok: true });
  });

  // implements FR-21 of add-author-profiles
  it.each([
    [WRITE_SCOPES.profileWrite, "too-many-saves"],
    [WRITE_SCOPES.photoUpload, "too-many-uploads"],
  ] as const)("refuses an attempt over the %s limit with %s", async (scope, failure) => {
    supabase.onRpc(FUNCTION_NAME, okResponse(false));

    await expect(consumeWriteAllowance(scope)).resolves.toEqual({ ok: false, failure });
  });

  // implements FR-21 of add-author-profiles
  it.each([
    ["no data", null],
    ["a string", "true"],
    ["a number", 1],
  ])("fails closed as unknown on %s instead of a boolean", async (_label, data) => {
    supabase.onRpc(FUNCTION_NAME, okResponse(data));

    await expect(consumeWriteAllowance(WRITE_SCOPES.profileWrite)).resolves.toEqual({ ok: false, failure: "unknown" });
    expect(console.error).toHaveBeenCalledWith("[authors] check write limit failed: ZodError");
  });

  // implements FR-21, FR-9 of add-author-profiles
  it.each([
    ["a server error", errorResponse("XX000", HTTP_SERVICE_UNAVAILABLE), "unavailable"],
    ["an expired session", errorResponse("PGRST303", HTTP_UNAUTHORIZED), "unauthenticated"],
    ["a missing function", errorResponse("PGRST202", HTTP_NOT_FOUND), "unknown"],
  ] as const)("maps %s from the function to %s", async (_label, response, failure) => {
    supabase.onRpc(FUNCTION_NAME, response);

    await expect(consumeWriteAllowance(WRITE_SCOPES.profileWrite)).resolves.toEqual({ ok: false, failure });
  });

  // implements FR-21, NFR-3 of add-author-profiles
  it("logs a failed check by its code only, never the error's message", async () => {
    supabase.onRpc(FUNCTION_NAME, errorResponse("PGRST202", HTTP_NOT_FOUND));

    await consumeWriteAllowance(WRITE_SCOPES.profileWrite);

    expect(console.error).toHaveBeenCalledExactlyOnceWith("[authors] check write limit failed: PostgrestError PGRST202");
  });

  // implements FR-21 of add-author-profiles
  it("maps a missing Supabase config to unavailable without throwing", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

    await expect(consumeWriteAllowance(WRITE_SCOPES.profileWrite)).resolves.toEqual({
      ok: false,
      failure: "unavailable",
    });
  });
});
