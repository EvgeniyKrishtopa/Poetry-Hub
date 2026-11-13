// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { listOwnBoard } from "../../dal/own-board";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const HTTP_OK = 200;
const HTTP_UNAVAILABLE = 503;
const CONFIG_VARIABLE = "NEXT_PUBLIC_SUPABASE_URL";

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const AUTUMN_ID = "40000000-0000-4000-8000-000000000001";
const SPRING_ID = "40000000-0000-4000-8000-000000000002";
const POEM_ONE_ID = "50000000-0000-4000-8000-000000000001";
const POEM_TWO_ID = "50000000-0000-4000-8000-000000000002";
const POEM_TITLE = "Ночной вокзал";
const COLLECTION_TITLE = "Осенний цикл";

interface QueryResponse {
  readonly data: unknown;
  readonly error: unknown;
  readonly status: number;
}

const COLLECTIONS_OK: QueryResponse = {
  data: [
    { id: SPRING_ID, title: "Весна" },
    { id: AUTUMN_ID, title: COLLECTION_TITLE },
  ],
  error: null,
  status: HTTP_OK,
};
const POEMS_OK: QueryResponse = {
  data: [
    { id: POEM_TWO_ID, title: "Письмо", collection_id: AUTUMN_ID },
    { id: POEM_ONE_ID, title: POEM_TITLE, collection_id: null },
  ],
  error: null,
  status: HTTP_OK,
};

/** A PostgREST-shaped error whose message quotes the row, as real ones can. */
function queryError(): QueryResponse {
  return {
    data: null,
    error: { code: "XX000", message: `row (${POEM_ONE_ID}, ${POEM_TITLE}, ${AUTHOR_ID})` },
    status: HTTP_UNAVAILABLE,
  };
}

/** Records one table's query chain and answers it when awaited. */
function fakeQuery(response: QueryResponse | Error) {
  const calls: unknown[][] = [];
  const settle = () => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response));
  const builder = {
    select: (...args: unknown[]) => (calls.push(["select", ...args]), builder),
    eq: (...args: unknown[]) => (calls.push(["eq", ...args]), builder),
    order: (...args: unknown[]) => (calls.push(["order", ...args]), builder),
    then: (resolve: (value: QueryResponse) => unknown, reject: (reason: unknown) => unknown) => settle().then(resolve, reject),
  };
  return { builder, calls };
}

let byTable: Record<string, ReturnType<typeof fakeQuery>>;

function answer(collections: QueryResponse | Error, poems: QueryResponse | Error): void {
  byTable = { collections: fakeQuery(collections), poems: fakeQuery(poems) };
  const from = vi.fn((table: string) => byTable[table]?.builder);
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ from } as unknown as SupabaseClient);
}

function loggedText(): string {
  return vi.mocked(console.error).mock.calls.flat().join("\n");
}

// implements NFR-7 of drag-and-drop-ordering
function expectNothingSecretLogged(): void {
  const logged = loggedText();
  for (const secret of [POEM_TITLE, COLLECTION_TITLE, POEM_ONE_ID, AUTUMN_ID, AUTHOR_ID]) expect(logged).not.toContain(secret);
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("listOwnBoard", () => {
  // implements FR-9 of drag-and-drop-ordering
  it("reads both tables for the own author ordered by position then id, and nests the rows", async () => {
    answer(COLLECTIONS_OK, POEMS_OK);

    const board = await listOwnBoard(AUTHOR_ID);

    expect(board).toEqual({
      ok: true,
      arrangement: {
        collections: [
          { id: SPRING_ID, title: "Весна", poems: [] },
          { id: AUTUMN_ID, title: COLLECTION_TITLE, poems: [{ id: POEM_TWO_ID, title: "Письмо" }] },
        ],
        freePoems: [{ id: POEM_ONE_ID, title: POEM_TITLE }],
      },
    });
    for (const table of ["collections", "poems"]) {
      const calls = byTable[table]?.calls ?? [];
      expect(calls).toContainEqual(["eq", "author_id", AUTHOR_ID]);
      expect(calls).toContainEqual(["order", "position", { ascending: true }]);
      expect(calls).toContainEqual(["order", "id", { ascending: true }]);
    }
  });

  // implements FR-9 of drag-and-drop-ordering: failure matrix row 1
  it("says the collections are unavailable when only that read fails, and logs the kind only", async () => {
    answer(queryError(), POEMS_OK);

    await expect(listOwnBoard(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "collections-unavailable" });
    expect(console.error).toHaveBeenCalledOnce();
    expect(loggedText()).toContain("[work-ordering] list board collections failed: PostgrestError XX000");
    expectNothingSecretLogged();
  });

  // implements FR-9 of drag-and-drop-ordering: failure matrix row 2
  it("says the poems are unavailable when only that read fails", async () => {
    answer(COLLECTIONS_OK, queryError());

    await expect(listOwnBoard(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "poems-unavailable" });
    expect(loggedText()).toContain("[work-ordering] list board poems failed");
    expectNothingSecretLogged();
  });

  // implements FR-9 of drag-and-drop-ordering: failure matrix row 3, the poems' text wins
  it("says the poems are unavailable when both reads fail, logging each failure once", async () => {
    answer(queryError(), queryError());

    await expect(listOwnBoard(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "poems-unavailable" });
    expect(console.error).toHaveBeenCalledTimes(2);
    expectNothingSecretLogged();
  });

  it("treats a row of the wrong shape as a failed read, never a guessed list", async () => {
    answer(COLLECTIONS_OK, { data: [{ id: POEM_ONE_ID, title: POEM_TITLE }], error: null, status: HTTP_OK });

    await expect(listOwnBoard(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "poems-unavailable" });
    expectNothingSecretLogged();
  });

  it("treats a throw as a failed read", async () => {
    answer(new TypeError("fetch failed"), POEMS_OK);

    await expect(listOwnBoard(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "collections-unavailable" });
    expect(loggedText()).toContain("[work-ordering] list board collections failed: TypeError");
  });

  it("treats a throw in the poems read as a failed read", async () => {
    answer(COLLECTIONS_OK, new TypeError("fetch failed"));

    await expect(listOwnBoard(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "poems-unavailable" });
    expect(loggedText()).toContain("[work-ordering] list board poems failed: TypeError");
  });

  it("treats a collections row of the wrong shape as a failed read", async () => {
    answer({ data: [{ id: AUTUMN_ID }], error: null, status: HTTP_OK }, POEMS_OK);

    await expect(listOwnBoard(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "collections-unavailable" });
    expectNothingSecretLogged();
  });

  it("treats a missing config as a failed read without a log line of its own", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError([CONFIG_VARIABLE]));

    await expect(listOwnBoard(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "poems-unavailable" });
    expect(console.error).not.toHaveBeenCalled();
  });
});
