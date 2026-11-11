// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { consumeMoveAllowance } from "../../dal/move-allowance";
import { moveOwnCollection, moveOwnPoem } from "../../dal/move-writes";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const HTTP_UNAVAILABLE = 503;
const NO_RESPONSE = 0;
const TO_INDEX = 3;

const POEM_ID = "1a2b3c4d-0000-4000-8000-000000000001";
const FROM_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const TO_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6e";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const CONFIG_VARIABLE = "NEXT_PUBLIC_SUPABASE_URL";

const POEM_INPUT = {
  poemId: POEM_ID,
  from: { kind: "collection", collectionId: FROM_ID },
  to: { kind: "collection", collectionId: TO_ID },
  toIndex: TO_INDEX,
} as const;
const COLLECTION_INPUT = { collectionId: FROM_ID, toIndex: TO_INDEX } as const;

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
  return { data: null, error: { code, message: `poem ${POEM_ID}`, details: FROM_ID }, status };
}

let rpc: ReturnType<typeof vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>>;

function answer(response: RpcResponse): void {
  rpc.mockResolvedValue(response);
}

function loggedText(): string {
  return vi.mocked(console.error).mock.calls.flat().join("\n");
}

// implements NFR-7 of drag-and-drop-ordering
function expectNothingSecretLogged(): void {
  const logged = loggedText();
  for (const secret of [POEM_ID, FROM_ID, TO_ID, AUTHOR_ID]) expect(logged).not.toContain(secret);
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

/** The classifier's kinds and a bad shape, each logged by kind only; shared by both moves. */
const FAILURES: readonly [string, () => void, string][] = [
  ["a 5xx", () => answer(rpcError("XX000", HTTP_UNAVAILABLE)), "unavailable"],
  ["no response (status 0)", () => answer(rpcError("", NO_RESPONSE)), "unavailable"],
  ["a rejected JWT", () => answer(rpcError("PGRST301", HTTP_UNAUTHORIZED)), "unauthenticated"],
  ["an input guard (22023)", () => answer(rpcError("22023", HTTP_OK)), "unknown"],
  ["an unknown status", () => answer(ok({ status: "maybe" })), "unknown"],
  ["a moved answer with no author", () => answer(ok({ status: "moved" })), "unknown"],
  ["a throw", () => rpc.mockRejectedValue(new TypeError("fetch failed")), "unavailable"],
  [
    "a missing config",
    () => vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError([CONFIG_VARIABLE])),
    "unavailable",
  ],
];

describe("moveOwnPoem", () => {
  // implements FR-6 of drag-and-drop-ordering
  it("calls move_my_poem with both lists, the place, and no owner", async () => {
    answer(ok({ status: "moved", author_id: AUTHOR_ID }));

    await expect(moveOwnPoem(POEM_INPUT)).resolves.toEqual({ ok: true, status: "moved", authorId: AUTHOR_ID });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("move_my_poem", {
      poem_id: POEM_ID,
      from_collection_id: FROM_ID,
      to_collection_id: TO_ID,
      to_index: TO_INDEX,
    });
  });

  // implements FR-4 of drag-and-drop-ordering: the free poems are sent as no collection
  it("sends the free poems as a null collection", async () => {
    answer(ok({ status: "moved", author_id: AUTHOR_ID }));

    await moveOwnPoem({ poemId: POEM_ID, from: { kind: "free" }, to: { kind: "free" }, toIndex: 0 });

    expect(rpc).toHaveBeenCalledExactlyOnceWith("move_my_poem", {
      poem_id: POEM_ID,
      from_collection_id: null,
      to_collection_id: null,
      to_index: 0,
    });
  });

  // implements FR-11 of drag-and-drop-ordering
  it.each(["stale", "not-found"] as const)("passes %s through", async (status) => {
    answer(ok({ status }));

    await expect(moveOwnPoem(POEM_INPUT)).resolves.toEqual({ ok: true, status });
  });

  // implements FR-6, NFR-7 of drag-and-drop-ordering
  it.each(FAILURES)("classifies %s", async (_case, arrange, failure) => {
    arrange();

    await expect(moveOwnPoem(POEM_INPUT)).resolves.toEqual({ ok: false, failure });
    expectNothingSecretLogged();
  });

  // implements NFR-7 of drag-and-drop-ordering
  it("logs the operation and the kind", async () => {
    answer(rpcError("XX000", HTTP_UNAVAILABLE));

    await moveOwnPoem(POEM_INPUT);

    expect(loggedText()).toBe("[work-ordering] move poem failed: PostgrestError XX000");
  });
});

describe("moveOwnCollection", () => {
  // implements FR-5 of drag-and-drop-ordering
  it("calls move_my_collection with the collection and the place", async () => {
    answer(ok({ status: "moved", author_id: AUTHOR_ID }));

    await expect(moveOwnCollection(COLLECTION_INPUT)).resolves.toEqual({
      ok: true,
      status: "moved",
      authorId: AUTHOR_ID,
    });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("move_my_collection", {
      collection_id: FROM_ID,
      to_index: TO_INDEX,
    });
  });

  // implements FR-11 of drag-and-drop-ordering
  it.each(["stale", "not-found"] as const)("passes %s through", async (status) => {
    answer(ok({ status }));

    await expect(moveOwnCollection(COLLECTION_INPUT)).resolves.toEqual({ ok: true, status });
  });

  // implements FR-6, NFR-7 of drag-and-drop-ordering
  it.each(FAILURES)("classifies %s", async (_case, arrange, failure) => {
    arrange();

    await expect(moveOwnCollection(COLLECTION_INPUT)).resolves.toEqual({ ok: false, failure });
    expectNothingSecretLogged();
  });

  // implements NFR-7 of drag-and-drop-ordering
  it("logs the operation and the kind", async () => {
    answer(rpcError("XX000", HTTP_UNAVAILABLE));

    await moveOwnCollection(COLLECTION_INPUT);

    expect(loggedText()).toBe("[work-ordering] move collection failed: PostgrestError XX000");
  });
});

describe("consumeMoveAllowance", () => {
  // implements NFR-2 of drag-and-drop-ordering
  it("counts against the order_move scope and allows the attempt", async () => {
    answer(ok(true));

    await expect(consumeMoveAllowance()).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("consume_write_allowance", { scope: "order_move" });
  });

  // implements NFR-2 of drag-and-drop-ordering
  it("answers too-many-moves over the limit and warns", async () => {
    answer(ok(false));

    await expect(consumeMoveAllowance()).resolves.toEqual({ ok: false, failure: "too-many-moves" });
    expect(console.warn).toHaveBeenCalledExactlyOnceWith("[work-ordering] move limit reached");
  });

  it.each([
    ["a 5xx", () => answer(rpcError("XX000", HTTP_UNAVAILABLE)), "unavailable"],
    ["a rejected JWT", () => answer(rpcError("PGRST301", HTTP_UNAUTHORIZED)), "unauthenticated"],
    ["a non-boolean answer", () => answer(ok("yes")), "unknown"],
    ["a throw", () => rpc.mockRejectedValue(new TypeError("fetch failed")), "unavailable"],
  ] as const)("classifies %s", async (_case, arrange, failure) => {
    arrange();

    await expect(consumeMoveAllowance()).resolves.toEqual({ ok: false, failure });
  });

  // implements NFR-7 of drag-and-drop-ordering
  it("logs a failed check by operation and kind", async () => {
    answer(rpcError("XX000", HTTP_UNAVAILABLE));

    await consumeMoveAllowance();

    expect(loggedText()).toBe("[work-ordering] check move limit failed: PostgrestError XX000");
  });
});
