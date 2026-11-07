// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { consumeCollectionEditAllowance } from "../../dal/collection-edit-allowance";
import { createOwnCollection, deleteOwnCollection, updateOwnCollection } from "../../dal/collection-writes";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const HTTP_UNAVAILABLE = 503;
const NO_RESPONSE = 0;

const COLLECTION_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const TITLE = "Осенний цикл";
const DESCRIPTION = "Стихи октября";
const CONFIG_VARIABLE = "NEXT_PUBLIC_SUPABASE_URL";

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
  return { data: null, error: { code, message: `row (${COLLECTION_ID}, ${TITLE}, ${DESCRIPTION})`, details: AUTHOR_ID }, status };
}

let rpc: ReturnType<typeof vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>>;

function answer(response: RpcResponse): void {
  rpc.mockResolvedValue(response);
}

function loggedText(): string {
  return vi.mocked(console.error).mock.calls.flat().join("\n");
}

// implements NFR-5 of add-poem-collections
function expectNothingSecretLogged(): void {
  const logged = loggedText();
  for (const secret of [TITLE, DESCRIPTION, COLLECTION_ID, AUTHOR_ID]) expect(logged).not.toContain(secret);
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

/** Every RPC's shared failure table: the classifier's three kinds, each logged by kind only. */
const FAILURES: readonly [string, () => void, string][] = [
  ["a 5xx", () => answer(rpcError("XX000", HTTP_UNAVAILABLE)), "unavailable"],
  ["no response (status 0)", () => answer(rpcError("", NO_RESPONSE)), "unavailable"],
  ["a rejected JWT", () => answer(rpcError("PGRST301", HTTP_UNAUTHORIZED)), "unauthenticated"],
  ["a grant or policy error (42501)", () => answer(rpcError("42501", HTTP_OK)), "unknown"],
  ["a bad shape", () => answer(ok({ status: "maybe" })), "unknown"],
  ["a throw", () => rpc.mockRejectedValue(new TypeError("fetch failed")), "unavailable"],
  ["a missing config", () => vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError([CONFIG_VARIABLE])), "unavailable"],
];

describe("a missing config", () => {
  // The proxy already logs it on every request, so the DAL stays silent.
  it.each([
    ["createOwnCollection", () => createOwnCollection(TITLE, DESCRIPTION)],
    ["updateOwnCollection", () => updateOwnCollection({ collectionId: COLLECTION_ID, title: TITLE, description: null })],
    ["deleteOwnCollection", () => deleteOwnCollection(COLLECTION_ID)],
    ["consumeCollectionEditAllowance", () => consumeCollectionEditAllowance()],
  ])("logs nothing from %s", async (_case, call) => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError([CONFIG_VARIABLE]));

    await expect(call()).resolves.toEqual({ ok: false, failure: "unavailable" });
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe("createOwnCollection", () => {
  // implements FR-4 of add-poem-collections
  it("calls create_my_collection with the title and description only and returns the new id", async () => {
    answer(ok({ status: "created", id: COLLECTION_ID }));

    await expect(createOwnCollection(TITLE, null)).resolves.toEqual({ ok: true, status: "created", id: COLLECTION_ID });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("create_my_collection", { title: TITLE, description: null });
  });

  // implements FR-4, FR-5 of add-poem-collections
  it.each(["not-public", "over-limit"] as const)("passes %s through", async (status) => {
    answer(ok({ status }));

    await expect(createOwnCollection(TITLE, DESCRIPTION)).resolves.toEqual({ ok: true, status });
  });

  // implements FR-4, NFR-5 of add-poem-collections
  it.each(FAILURES)("classifies %s", async (_case, arrange, failure) => {
    arrange();

    await expect(createOwnCollection(TITLE, DESCRIPTION)).resolves.toEqual({ ok: false, failure });
    expectNothingSecretLogged();
  });

  it("logs the operation and the kind", async () => {
    answer(rpcError("XX000", HTTP_UNAVAILABLE));

    await createOwnCollection(TITLE, DESCRIPTION);

    expect(loggedText()).toBe("[collection-management] create collection failed: PostgrestError XX000");
  });
});

describe("updateOwnCollection", () => {
  const INPUT = { collectionId: COLLECTION_ID, title: TITLE, description: DESCRIPTION } as const;

  // implements FR-9 of add-poem-collections
  it("calls update_my_collection with the id, title, and description", async () => {
    answer(ok({ status: "updated" }));

    await expect(updateOwnCollection(INPUT)).resolves.toEqual({ ok: true, status: "updated" });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("update_my_collection", {
      collection_id: COLLECTION_ID,
      title: TITLE,
      description: DESCRIPTION,
    });
  });

  // implements FR-11 of add-poem-collections
  it("passes not-found through", async () => {
    answer(ok({ status: "not-found" }));

    await expect(updateOwnCollection(INPUT)).resolves.toEqual({ ok: true, status: "not-found" });
  });

  // implements FR-11, NFR-5 of add-poem-collections
  it.each(FAILURES)("classifies %s", async (_case, arrange, failure) => {
    arrange();

    await expect(updateOwnCollection(INPUT)).resolves.toEqual({ ok: false, failure });
    expectNothingSecretLogged();
  });
});

describe("deleteOwnCollection", () => {
  // implements FR-13 of add-poem-collections
  it("calls delete_my_collection with the id only and returns the stored title", async () => {
    answer(ok({ status: "deleted", title: TITLE }));

    await expect(deleteOwnCollection(COLLECTION_ID)).resolves.toEqual({ ok: true, status: "deleted", title: TITLE });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("delete_my_collection", { collection_id: COLLECTION_ID });
  });

  // implements FR-13 of add-poem-collections
  it("passes not-found through", async () => {
    answer(ok({ status: "not-found" }));

    await expect(deleteOwnCollection(COLLECTION_ID)).resolves.toEqual({ ok: true, status: "not-found" });
  });

  it("treats a deleted answer without a title as a bad shape", async () => {
    answer(ok({ status: "deleted" }));

    await expect(deleteOwnCollection(COLLECTION_ID)).resolves.toEqual({ ok: false, failure: "unknown" });
  });

  // implements FR-13, NFR-5 of add-poem-collections
  it.each(FAILURES)("classifies %s", async (_case, arrange, failure) => {
    arrange();

    await expect(deleteOwnCollection(COLLECTION_ID)).resolves.toEqual({ ok: false, failure });
    expectNothingSecretLogged();
  });
});

describe("consumeCollectionEditAllowance", () => {
  // implements FR-10 of add-poem-collections
  it("counts one attempt against the collection_edit scope", async () => {
    answer(ok(true));

    await expect(consumeCollectionEditAllowance()).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("consume_write_allowance", { scope: "collection_edit" });
  });

  // implements FR-10 of add-poem-collections
  it("answers too-many-saves over the limit and warns", async () => {
    answer(ok(false));

    await expect(consumeCollectionEditAllowance()).resolves.toEqual({ ok: false, failure: "too-many-saves" });
    expect(console.warn).toHaveBeenCalledExactlyOnceWith("[collection-management] edit limit reached");
  });

  // implements FR-10, NFR-5 of add-poem-collections
  it.each(FAILURES)("classifies %s", async (_case, arrange, failure) => {
    arrange();

    await expect(consumeCollectionEditAllowance()).resolves.toEqual({ ok: false, failure });
    expectNothingSecretLogged();
  });

  // implements NFR-5 of add-poem-collections
  it("logs the operation and the kind", async () => {
    answer(rpcError("XX000", HTTP_UNAVAILABLE));

    await consumeCollectionEditAllowance();

    expect(loggedText()).toBe("[collection-management] check edit limit failed: PostgrestError XX000");
  });
});
