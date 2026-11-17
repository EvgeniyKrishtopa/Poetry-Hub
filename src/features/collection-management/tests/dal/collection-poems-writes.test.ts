// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { consumeCollectionPoemsSaveAllowance } from "../../dal/collection-poems-allowance";
import { saveOwnCollectionPoems } from "../../dal/collection-poems-writes";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_UNAVAILABLE = 503;
const NO_RESPONSE = 0;

const COLLECTION_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const ADDED_ID = "1a2b3c4d-0000-4000-8000-000000000001";
const REMOVED_ID = "1a2b3c4d-0000-4000-8000-000000000002";
const CONFIG_VARIABLE = "NEXT_PUBLIC_SUPABASE_URL";

const INPUT = { collectionId: COLLECTION_ID, added: [ADDED_ID], removed: [REMOVED_ID] } as const;

interface RpcResponse {
  readonly data: unknown;
  readonly error: unknown;
  readonly status: number;
}

function ok(data: unknown): RpcResponse {
  return { data, error: null, status: HTTP_OK };
}

function rpcError(code: string, status: number): RpcResponse {
  // Shaped like postgrest-js's error object; the message quotes the ids, as real ones can.
  return { data: null, error: { code, message: `poems (${ADDED_ID}, ${REMOVED_ID})`, details: COLLECTION_ID }, status };
}

let rpc: ReturnType<typeof vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>>;

function answer(response: RpcResponse): void {
  rpc.mockResolvedValue(response);
}

function loggedText(): string {
  return vi.mocked(console.error).mock.calls.flat().join("\n");
}

// implements NFR-5 of add-poems-to-collections
function expectNothingSecretLogged(): void {
  const logged = loggedText();
  for (const secret of [COLLECTION_ID, ADDED_ID, REMOVED_ID]) expect(logged).not.toContain(secret);
}

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

/** The classifier's kinds, each logged by kind only. */
const FAILURES: readonly [string, () => void, string][] = [
  ["a 5xx", () => answer(rpcError("XX000", HTTP_UNAVAILABLE)), "unavailable"],
  ["no response (status 0)", () => answer(rpcError("", NO_RESPONSE)), "unavailable"],
  ["a rejected JWT", () => answer(rpcError("PGRST301", HTTP_UNAUTHORIZED)), "unauthenticated"],
  ["the input guard (22023)", () => answer(rpcError("22023", HTTP_OK)), "unknown"],
  // implements FR-15 of admin-moderation
  ["a blocked account (AM001)", () => answer(rpcError("AM001", HTTP_BAD_REQUEST)), "restricted"],
  ["a bad shape", () => answer(ok({ status: "maybe" })), "unknown"],
  ["a throw", () => rpc.mockRejectedValue(new TypeError("fetch failed")), "unavailable"],
  ["a missing config", () => vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError([CONFIG_VARIABLE])), "unavailable"],
];

describe("saveOwnCollectionPoems", () => {
  // implements FR-6 of add-poems-to-collections
  it("calls save_my_collection_poems with the collection and both lists", async () => {
    answer(ok({ status: "saved" }));

    await expect(saveOwnCollectionPoems(INPUT)).resolves.toEqual({ ok: true, status: "saved" });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("save_my_collection_poems", {
      collection_id: COLLECTION_ID,
      added: [ADDED_ID],
      removed: [REMOVED_ID],
    });
  });

  // implements FR-8 of add-poems-to-collections
  it.each(["stale", "not-found"] as const)("passes %s through", async (status) => {
    answer(ok({ status }));

    await expect(saveOwnCollectionPoems(INPUT)).resolves.toEqual({ ok: true, status });
  });

  // implements FR-8, NFR-5 of add-poems-to-collections
  it.each(FAILURES)("classifies %s", async (_case, arrange, failure) => {
    arrange();

    await expect(saveOwnCollectionPoems(INPUT)).resolves.toEqual({ ok: false, failure });
    expectNothingSecretLogged();
  });

  // implements NFR-5 of add-poems-to-collections
  it("logs the operation and the kind", async () => {
    answer(rpcError("XX000", HTTP_UNAVAILABLE));

    await saveOwnCollectionPoems(INPUT);

    expect(loggedText()).toBe("[collection-management] save collection poems failed: PostgrestError XX000");
  });
});

describe("consumeCollectionPoemsSaveAllowance", () => {
  // implements FR-7 of add-poems-to-collections
  it("counts against the collection_poems_save scope and allows the attempt", async () => {
    answer(ok(true));

    await expect(consumeCollectionPoemsSaveAllowance()).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("consume_write_allowance", { scope: "collection_poems_save" });
  });

  // implements FR-7 of add-poems-to-collections
  it("answers too-many-saves over the limit and warns", async () => {
    answer(ok(false));

    await expect(consumeCollectionPoemsSaveAllowance()).resolves.toEqual({ ok: false, failure: "too-many-saves" });
    expect(console.warn).toHaveBeenCalledExactlyOnceWith("[collection-management] collection poems save limit reached");
  });

  it.each([
    ["a 5xx", () => answer(rpcError("XX000", HTTP_UNAVAILABLE)), "unavailable"],
    ["a rejected JWT", () => answer(rpcError("PGRST301", HTTP_UNAUTHORIZED)), "unauthenticated"],
    ["a non-boolean answer", () => answer(ok("yes")), "unknown"],
    ["a throw", () => rpc.mockRejectedValue(new TypeError("fetch failed")), "unavailable"],
  ] as const)("classifies %s", async (_case, arrange, failure) => {
    arrange();

    await expect(consumeCollectionPoemsSaveAllowance()).resolves.toEqual({ ok: false, failure });
  });

  it("logs a failed check by operation and kind", async () => {
    answer(rpcError("XX000", HTTP_UNAVAILABLE));

    await consumeCollectionPoemsSaveAllowance();

    expect(loggedText()).toBe("[collection-management] check collection poems save limit failed: PostgrestError XX000");
  });
});
