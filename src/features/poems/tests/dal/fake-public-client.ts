import type { SupabaseClient } from "@supabase/supabase-js";
import { vi } from "vitest";

/** What a postgrest-js call resolves with. */
interface FakeResponse {
  readonly data: unknown;
  readonly error: unknown;
  readonly status: number;
}

const HTTP_OK = 200;

export const ILLUSTRATIONS_URL_BASE = "http://127.0.0.1:54321/storage/v1/object/public/poem-illustrations";

export function okResponse(data: unknown): FakeResponse {
  return { data, error: null, status: HTTP_OK };
}

export function errorResponse(code: string, status: number): FakeResponse {
  // Shaped like postgrest-js's plain error object; the message quotes a value, as real ones can.
  return { data: null, error: { code, message: "failing row contains (Секрет)", details: "", hint: "" }, status };
}

/** One `from(...)` chain: every builder call in order, e.g. `["eq", ["author_id", "…"]]`. */
type QueryCalls = Array<readonly [method: string, args: readonly unknown[]]>;

/** A public-client double: each `from(...)` chain resolves with the next queued response and records its calls. */
export function createFakePublicClient() {
  const queryResponses: FakeResponse[] = [];
  const queries: QueryCalls[] = [];

  function from(table: string) {
    const calls: QueryCalls = [["from", [table]]];
    queries.push(calls);
    const response = queryResponses.shift() ?? okResponse([]);

    const builder = {
      then(resolve: (value: FakeResponse) => unknown, reject: (reason: unknown) => unknown) {
        return Promise.resolve(response).then(resolve, reject);
      },
    };
    for (const method of ["select", "eq", "order"]) {
      Object.assign(builder, {
        [method]: (...args: unknown[]) => {
          calls.push([method, args]);
          return builder;
        },
      });
    }
    return builder;
  }

  const bucket = {
    getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `${ILLUSTRATIONS_URL_BASE}/${path}` } })),
  };
  const storage = { from: vi.fn(() => bucket) };

  return {
    client: { from: vi.fn(from), storage } as unknown as SupabaseClient,
    storage,
    queries,
    /** Queues the response for the next `from(...)` chain. */
    queueQuery(response: FakeResponse) {
      queryResponses.push(response);
    },
  };
}

export type FakePublicClient = ReturnType<typeof createFakePublicClient>;
