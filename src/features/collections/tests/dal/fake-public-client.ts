import type { SupabaseClient } from "@supabase/supabase-js";
import { vi } from "vitest";

/** What a postgrest-js call resolves with. */
interface FakeResponse {
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
  return { data: null, error: { code, message: "failing row contains (Секрет)", details: "", hint: "" }, status };
}

/** One `from(...)` chain: every builder call in order, e.g. `["eq", ["author_id", "…"]]`. */
type QueryCalls = Array<readonly [method: string, args: readonly unknown[]]>;

/**
 * A public-client double: each `from(table)` chain resolves with the next response queued for that table and records
 * its calls. Queues are per table, so the collections and the poems read don't depend on which starts first.
 */
export function createFakePublicClient() {
  const queryResponses = new Map<string, FakeResponse[]>();
  const queries: QueryCalls[] = [];

  function from(table: string) {
    const calls: QueryCalls = [["from", [table]]];
    queries.push(calls);
    const response = queryResponses.get(table)?.shift() ?? okResponse([]);

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

  return {
    client: { from: vi.fn(from) } as unknown as SupabaseClient,
    queries,
    /** Queues the response for the next `from(table)` chain. */
    queueQuery(table: string, response: FakeResponse) {
      queryResponses.set(table, [...(queryResponses.get(table) ?? []), response]);
    },
  };
}

export type FakePublicClient = ReturnType<typeof createFakePublicClient>;
