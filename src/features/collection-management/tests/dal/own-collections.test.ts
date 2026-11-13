// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getOwnPublicAuthor } from "@/features/authors";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { getOwnCollection, getOwnCollectionTitle } from "../../dal/own-collections";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/features/authors", () => ({ getOwnPublicAuthor: vi.fn() }));

const HTTP_OK = 200;
const HTTP_UNAVAILABLE = 503;

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const COLLECTION_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const TITLE = "Осенний цикл";
const DESCRIPTION = "Стихи октября";

interface QueryResponse {
  readonly data: unknown;
  readonly error: unknown;
  readonly status: number;
}

/** A PostgREST-shaped error whose message quotes the row, as real ones can. */
function queryError(status: number): QueryResponse {
  return { data: null, error: { code: "XX000", message: `row (${COLLECTION_ID}, ${TITLE}, ${AUTHOR_ID})` }, status };
}

/** Records the query chain and answers it: awaited directly (the list) or through `maybeSingle()` (one row). */
function fakeQuery(response: QueryResponse | Error) {
  const calls: unknown[][] = [];
  const settle = () => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response));
  const builder = {
    select: (...args: unknown[]) => (calls.push(["select", ...args]), builder),
    eq: (...args: unknown[]) => (calls.push(["eq", ...args]), builder),
    order: (...args: unknown[]) => (calls.push(["order", ...args]), builder),
    maybeSingle: () => (calls.push(["maybeSingle"]), settle()),
    then: (resolve: (value: QueryResponse) => unknown, reject: (reason: unknown) => unknown) => settle().then(resolve, reject),
  };
  const from = vi.fn((table: string) => (calls.push(["from", table]), builder));
  return { from, calls };
}

let query: ReturnType<typeof fakeQuery>;

function answer(response: QueryResponse | Error): void {
  query = fakeQuery(response);
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ from: query.from } as unknown as SupabaseClient);
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
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "public", authorId: AUTHOR_ID });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("getOwnCollection", () => {
  // implements FR-6 of add-poem-collections
  // implements NFR-1 of public-collections: filtered by the own author id, so a public author's collection
  // that RLS now lets this client read still answers not-found on the owner's pages.
  it("reads the row by id and the own author's id", async () => {
    answer({ data: { id: COLLECTION_ID, title: TITLE, description: DESCRIPTION }, error: null, status: HTTP_OK });

    await expect(getOwnCollection(COLLECTION_ID)).resolves.toEqual({
      ok: true,
      collection: { id: COLLECTION_ID, title: TITLE, description: DESCRIPTION },
    });
    expect(query.calls).toEqual([
      ["from", "collections"],
      ["select", "id, title, description"],
      ["eq", "id", COLLECTION_ID],
      ["eq", "author_id", AUTHOR_ID],
      ["maybeSingle"],
    ]);
  });

  it("keeps a missing description as null", async () => {
    answer({ data: { id: COLLECTION_ID, title: TITLE, description: null }, error: null, status: HTTP_OK });

    await expect(getOwnCollection(COLLECTION_ID)).resolves.toEqual({
      ok: true,
      collection: { id: COLLECTION_ID, title: TITLE, description: null },
    });
  });

  // implements FR-6 of add-poem-collections
  it.each([
    ["an uppercase id", COLLECTION_ID.toUpperCase()],
    ["junk", "abc"],
  ])("answers not-found for %s without any read", async (_case, collectionId) => {
    answer({ data: null, error: null, status: HTTP_OK });

    await expect(getOwnCollection(collectionId)).resolves.toEqual({ ok: false, reason: "not-found" });
    expect(getOwnPublicAuthor).not.toHaveBeenCalled();
    expect(query.from).not.toHaveBeenCalled();
  });

  // implements FR-6 of add-poem-collections
  it("answers not-found while the own profile isn't public, reading no row", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "not-public" });
    answer({ data: null, error: null, status: HTTP_OK });

    await expect(getOwnCollection(COLLECTION_ID)).resolves.toEqual({ ok: false, reason: "not-found" });
    expect(query.from).not.toHaveBeenCalled();
  });

  // implements FR-6 of add-poem-collections
  it("answers not-found when no row comes back (unknown, or another author's under RLS)", async () => {
    answer({ data: null, error: null, status: HTTP_OK });

    await expect(getOwnCollection(COLLECTION_ID)).resolves.toEqual({ ok: false, reason: "not-found" });
  });

  // implements FR-6 of add-poem-collections
  it("answers unavailable when the profile read fails", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: false, failure: "unavailable" });
    answer({ data: null, error: null, status: HTTP_OK });

    await expect(getOwnCollection(COLLECTION_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
    expect(query.from).not.toHaveBeenCalled();
  });

  // implements FR-6, NFR-5 of add-poem-collections
  it.each([
    ["a query error", queryError(HTTP_UNAVAILABLE)],
    ["an empty-string description", { data: { id: COLLECTION_ID, title: TITLE, description: "" }, error: null, status: HTTP_OK }],
    ["a throw", new TypeError("fetch failed")],
  ])("answers unavailable for %s and logs its kind only", async (_case, response) => {
    answer(response);

    await expect(getOwnCollection(COLLECTION_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
    expect(loggedText()).toMatch(/^\[collection-management\] read collection failed: \S+/);
    expectNothingSecretLogged();
  });
});

describe("getOwnCollectionTitle", () => {
  it("answers the title of the own collection", async () => {
    answer({ data: { id: COLLECTION_ID, title: TITLE, description: null }, error: null, status: HTTP_OK });

    await expect(getOwnCollectionTitle(COLLECTION_ID)).resolves.toEqual({ ok: true, title: TITLE });
  });

  it("passes not-found and unavailable through", async () => {
    answer({ data: null, error: null, status: HTTP_OK });
    await expect(getOwnCollectionTitle("abc")).resolves.toEqual({ ok: false, reason: "not-found" });

    answer(queryError(HTTP_UNAVAILABLE));
    await expect(getOwnCollectionTitle(COLLECTION_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
  });
});
