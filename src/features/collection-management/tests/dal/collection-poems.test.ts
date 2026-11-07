// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { getCollectionPoemChoices, listCollectedPoems } from "../../dal/collection-poems";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const HTTP_OK = 200;
const HTTP_UNAVAILABLE = 503;

const COLLECTION_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const POEM_ID = "1a2b3c4d-0000-4000-8000-000000000001";
const OTHER_POEM_ID = "1a2b3c4d-0000-4000-8000-000000000002";
const TITLE = "Листопад";
const CONFIG_VARIABLE = "NEXT_PUBLIC_SUPABASE_URL";

interface RpcResponse {
  readonly data: unknown;
  readonly error: unknown;
  readonly status: number;
}

let rpc: ReturnType<typeof vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>>;

function answer(data: unknown): void {
  rpc.mockResolvedValue({ data, error: null, status: HTTP_OK });
}

function answerError(): void {
  // Shaped like postgrest-js's error object; the message quotes the row, as real ones can.
  rpc.mockResolvedValue({
    data: null,
    error: { code: "XX000", message: `row (${POEM_ID}, ${TITLE})`, details: COLLECTION_ID },
    status: HTTP_UNAVAILABLE,
  });
}

function loggedText(): string {
  return vi.mocked(console.error).mock.calls.flat().join("\n");
}

// implements NFR-5 of add-poems-to-collections
function expectNothingSecretLogged(): void {
  const logged = loggedText();
  for (const secret of [TITLE, COLLECTION_ID, POEM_ID]) expect(logged).not.toContain(secret);
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

/** Each read's failure table: every case is `{ ok: false }`, logged by kind only. */
const FAILURES: readonly [string, () => void][] = [
  ["an RPC error", answerError],
  ["a bad shape", () => answer([{ id: POEM_ID, title: TITLE }])],
  ["a non-array", () => answer({ status: "ok" })],
  ["a throw", () => rpc.mockRejectedValue(new TypeError("fetch failed"))],
];

describe("getCollectionPoemChoices", () => {
  // implements FR-4 of add-poems-to-collections
  it("calls my_collection_poem_choices with the id and returns the rows in order", async () => {
    const rows = [
      { id: POEM_ID, title: TITLE, selected: true },
      { id: OTHER_POEM_ID, title: "Ноябрь", selected: false },
    ];
    answer(rows);

    await expect(getCollectionPoemChoices(COLLECTION_ID)).resolves.toEqual({ ok: true, choices: rows });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("my_collection_poem_choices", { collection_id: COLLECTION_ID });
  });

  // implements FR-2 of add-poems-to-collections
  it("returns an empty list as is", async () => {
    answer([]);

    await expect(getCollectionPoemChoices(COLLECTION_ID)).resolves.toEqual({ ok: true, choices: [] });
  });

  // implements FR-4, NFR-5 of add-poems-to-collections
  it.each(FAILURES)("answers %s as a failed read", async (_case, arrange) => {
    arrange();

    await expect(getCollectionPoemChoices(COLLECTION_ID)).resolves.toEqual({ ok: false });
    expectNothingSecretLogged();
  });

  // implements NFR-5 of add-poems-to-collections
  it("logs the operation and the kind", async () => {
    answerError();

    await getCollectionPoemChoices(COLLECTION_ID);

    expect(loggedText()).toBe("[collection-management] read collection poem choices failed: PostgrestError XX000");
  });
});

describe("listCollectedPoems", () => {
  // implements FR-11 of add-poems-to-collections
  it("calls my_collected_poems and returns the rows in the app's spelling", async () => {
    answer([
      { collection_id: COLLECTION_ID, id: POEM_ID, title: TITLE },
      { collection_id: COLLECTION_ID, id: OTHER_POEM_ID, title: "Ноябрь" },
    ]);

    await expect(listCollectedPoems()).resolves.toEqual({
      ok: true,
      poems: [
        { collectionId: COLLECTION_ID, id: POEM_ID, title: TITLE },
        { collectionId: COLLECTION_ID, id: OTHER_POEM_ID, title: "Ноябрь" },
      ],
    });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("my_collected_poems", {});
  });

  it("returns an empty list as is", async () => {
    answer([]);

    await expect(listCollectedPoems()).resolves.toEqual({ ok: true, poems: [] });
  });

  // implements FR-11, NFR-5 of add-poems-to-collections
  it.each(FAILURES)("answers %s as a failed read", async (_case, arrange) => {
    arrange();

    await expect(listCollectedPoems()).resolves.toEqual({ ok: false });
    expectNothingSecretLogged();
  });

  it("logs the operation and the kind", async () => {
    answerError();

    await listCollectedPoems();

    expect(loggedText()).toBe("[collection-management] list collected poems failed: PostgrestError XX000");
  });
});

describe("a missing config", () => {
  // The proxy already logs it on every request, so the DAL stays silent.
  it.each([
    ["getCollectionPoemChoices", () => getCollectionPoemChoices(COLLECTION_ID)],
    ["listCollectedPoems", () => listCollectedPoems()],
  ])("fails %s quietly", async (_case, call) => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError([CONFIG_VARIABLE]));

    await expect(call()).resolves.toEqual({ ok: false });
    expect(console.error).not.toHaveBeenCalled();
  });
});
