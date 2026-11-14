import { expect, vi } from "vitest";

export const HTTP_OK = 200;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_FORBIDDEN = 403;
export const HTTP_UNAVAILABLE = 503;
export const NO_RESPONSE = 0;

export const ADMIN_USER_ID = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d";
export const TARGET_USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
export const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
export const POEM_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
export const COLLECTION_ID = "5d6e7f80-9a1b-4c2d-8e3f-4a5b6c7d8e9f";
export const TARGET_EMAIL = "ada.lovelace@example.com";
export const POEM_TITLE = "Секрет";
export const ILLUSTRATION_PATH = `${AUTHOR_ID}/0f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f.png`;

/** What `supabase.rpc()` resolves to: postgrest-js keeps the HTTP status on the response, beside the error. */
export interface RpcResponse {
  readonly data: unknown;
  readonly error: unknown;
  readonly status: number;
}

export function ok(data: unknown): RpcResponse {
  return { data, error: null, status: HTTP_OK };
}

/** Shaped like postgrest-js's error object; the message quotes the row, as real ones can. */
export function rpcError(code: string, status: number): RpcResponse {
  return {
    data: null,
    error: {
      code,
      message: `row (${TARGET_USER_ID}, ${TARGET_EMAIL}, ${POEM_TITLE}, ${ILLUSTRATION_PATH})`,
      details: AUTHOR_ID,
    },
    status,
  };
}

/** Everything the code under test wrote with `console.error`, as one string. */
export function loggedText(): string {
  return vi
    .mocked(console.error)
    .mock.calls.flat()
    .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
    .join("\n");
}

/** NFR-6: nothing a reader could recognise reaches a log line. */
export function expectNothingSecretLogged(): void {
  const logged = loggedText();
  for (const secret of [TARGET_USER_ID, TARGET_EMAIL, POEM_TITLE, AUTHOR_ID, POEM_ID, ILLUSTRATION_PATH]) {
    expect(logged).not.toContain(secret);
  }
}
