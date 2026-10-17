import type { SupabaseClient } from "@supabase/supabase-js";
import { vi } from "vitest";

/** What a postgrest-js call resolves with. */
export interface FakeResponse {
  readonly data: unknown;
  readonly error: unknown;
  readonly status: number;
}

const HTTP_OK = 200;

export function okResponse(data: unknown): FakeResponse {
  return { data, error: null, status: HTTP_OK };
}

export function errorResponse(code: string, status: number): FakeResponse {
  // Shaped like postgrest-js's plain error object; the message quotes a value, as real ones can.
  return { data: null, error: { code, message: `failing row contains (Anna)`, details: "", hint: "" }, status };
}

/** One `from(...)` chain: every builder call in order, e.g. `["select", ["id, …"]]`. */
type QueryCalls = Array<readonly [method: string, args: readonly unknown[]]>;

export const PUBLIC_URL_BASE = "http://127.0.0.1:54321/storage/v1/object/public/author-photos";

/**
 * A Supabase client double: `rpc` answers per function name, each `from(...)` chain resolves with the
 * next queued response and records its calls, and the Storage bucket's methods are `vi.fn`s.
 */
export function createFakeSupabase() {
  const rpcResponses = new Map<string, FakeResponse>();
  const queryResponses: FakeResponse[] = [];
  const queries: QueryCalls[] = [];

  const rpc = vi.fn(async (fn: string) => rpcResponses.get(fn) ?? okResponse(null));

  function from(table: string) {
    const calls: QueryCalls = [["from", [table]]];
    queries.push(calls);
    const response = queryResponses.shift() ?? okResponse(null);

    const builder = {
      then(resolve: (value: FakeResponse) => unknown, reject: (reason: unknown) => unknown) {
        return Promise.resolve(response).then(resolve, reject);
      },
    };
    for (const method of ["select", "update", "eq", "single", "maybeSingle"]) {
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
    upload: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: {}, error: null })),
    remove: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: [], error: null })),
    getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `${PUBLIC_URL_BASE}/${path}` } })),
  };
  const storage = { from: vi.fn(() => bucket) };

  return {
    client: { rpc, from: vi.fn(from), storage } as unknown as SupabaseClient,
    rpc,
    bucket,
    storage,
    queries,
    /** Answers `rpc(fn)`. */
    onRpc(fn: string, response: FakeResponse) {
      rpcResponses.set(fn, response);
    },
    /** Queues the response for the next `from(...)` chain. */
    queueQuery(response: FakeResponse) {
      queryResponses.push(response);
    },
  };
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;
