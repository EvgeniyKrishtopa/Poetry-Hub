// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { deleteOwnPoem } from "../../dal/poem-delete";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const HTTP_UNAVAILABLE = 503;
const NO_RESPONSE = 0;

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const POEM_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const TITLE = "Секрет";
const ILLUSTRATION_PATH = `${AUTHOR_ID}/0f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f.png`;

interface RpcResponse {
  readonly data: unknown;
  readonly error: unknown;
  readonly status: number;
}

function ok(data: unknown): RpcResponse {
  return { data, error: null, status: HTTP_OK };
}

function rpcError(code: string, status: number): RpcResponse {
  // Shaped like postgrest-js's error object; the message quotes the row, as real ones can.
  return {
    data: null,
    error: { code, message: `row (${POEM_ID}, ${TITLE}, ${ILLUSTRATION_PATH})`, details: AUTHOR_ID },
    status,
  };
}

function loggedText(): string {
  return vi
    .mocked(console.error)
    .mock.calls.flat()
    .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
    .join("\n");
}

// implements NFR-5 of delete-poem
function expectNothingSecretLogged(): void {
  const logged = loggedText();
  for (const secret of [TITLE, POEM_ID, AUTHOR_ID, ILLUSTRATION_PATH]) expect(logged).not.toContain(secret);
}

describe("deleteOwnPoem", () => {
  let rpc: ReturnType<typeof vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>>;

  function answer(response: RpcResponse): void {
    rpc.mockResolvedValue(response);
  }

  beforeEach(() => {
    rpc = vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-3 of delete-poem
  it("returns the deleted poem's author and illustration path, calling the function with the id only", async () => {
    answer(ok({ status: "deleted", author_id: AUTHOR_ID, illustration_path: ILLUSTRATION_PATH }));

    await expect(deleteOwnPoem(POEM_ID)).resolves.toEqual({
      ok: true,
      status: "deleted",
      authorId: AUTHOR_ID,
      illustrationPath: ILLUSTRATION_PATH,
    });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("delete_my_poem", { poem_id: POEM_ID });
  });

  // implements FR-3 of delete-poem
  it("passes a poem without an illustration as a null path", async () => {
    answer(ok({ status: "deleted", author_id: AUTHOR_ID, illustration_path: null }));

    await expect(deleteOwnPoem(POEM_ID)).resolves.toEqual({
      ok: true,
      status: "deleted",
      authorId: AUTHOR_ID,
      illustrationPath: null,
    });
  });

  // implements FR-4 of delete-poem
  it("passes not-found through without a log line", async () => {
    answer(ok({ status: "not-found" }));

    await expect(deleteOwnPoem(POEM_ID)).resolves.toEqual({ ok: true, status: "not-found" });
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements FR-5, FR-6 of delete-poem
  it.each([
    ["a rejected JWT", rpcError("PGRST301", HTTP_UNAUTHORIZED), "unauthenticated"],
    ["a 401 without a JWT code", rpcError("42501", HTTP_UNAUTHORIZED), "unauthenticated"],
    ["a 5xx", rpcError("XX000", HTTP_UNAVAILABLE), "unavailable"],
    ["a network failure", rpcError("", NO_RESPONSE), "unavailable"],
  ] as const)("classifies %s", async (_case, response, failure) => {
    answer(response);

    await expect(deleteOwnPoem(POEM_ID)).resolves.toEqual({ ok: false, failure });
    expect(console.error).toHaveBeenCalledOnce();
    expectNothingSecretLogged();
  });

  it("logs the PostgREST code only", async () => {
    answer(rpcError("XX000", HTTP_UNAVAILABLE));

    await deleteOwnPoem(POEM_ID);

    expect(console.error).toHaveBeenCalledExactlyOnceWith("[poem-management] delete poem failed: PostgrestError XX000");
  });

  it.each([
    ["an unknown status", { status: "gone" }],
    ["a deleted answer without an author", { status: "deleted", illustration_path: null }],
    ["a deleted answer with a non-UUID author", { status: "deleted", author_id: TITLE, illustration_path: null }],
    ["no data", null],
  ])("is unknown for %s", async (_case, data) => {
    answer(ok(data));

    await expect(deleteOwnPoem(POEM_ID)).resolves.toEqual({ ok: false, failure: "unknown" });
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[poem-management] delete poem failed: ZodError");
    expectNothingSecretLogged();
  });

  it("is unavailable when the request throws", async () => {
    rpc.mockRejectedValue(new TypeError("fetch failed"));

    await expect(deleteOwnPoem(POEM_ID)).resolves.toEqual({ ok: false, failure: "unavailable" });
    expectNothingSecretLogged();
  });

  it("is unavailable without a log line when Supabase isn't configured", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

    await expect(deleteOwnPoem(POEM_ID)).resolves.toEqual({ ok: false, failure: "unavailable" });
    expect(rpc).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});
