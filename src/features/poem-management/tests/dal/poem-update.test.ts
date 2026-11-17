// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { updateOwnPoem } from "../../dal/poem-update";
import type { UpdateOwnPoemInput } from "../../model/poem-management.types";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_UNAVAILABLE = 503;
const NO_RESPONSE = 0;

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const OTHER_AUTHOR_ID = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
const POEM_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const TITLE = "Секрет";
const TEXT = "тайна";
const FILE_NAME = "my-private-name.png";
const OLD_PATH = `${AUTHOR_ID}/0f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f.png`;

const BUCKET = "poem-illustrations";
const NEW_PATH = new RegExp(`^${AUTHOR_ID}/[0-9a-f-]{36}\\.png$`);

const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

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
  return {
    data: null,
    error: { code, message: `failing row contains (${POEM_ID}, ${TITLE}, ${TEXT}, ${OLD_PATH})`, details: AUTHOR_ID },
    status,
  };
}

/** A Supabase client double: `rpc` answers with one response; the bucket's methods are `vi.fn`s. */
function createFakeSupabase() {
  const rpc = vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>(async () =>
    ok({ status: "updated", author_id: AUTHOR_ID, replaced_path: null }),
  );
  const bucket = {
    upload: vi.fn<(path: string, body: Blob, options: unknown) => Promise<{ data: unknown; error: unknown }>>(
      async () => ({ data: {}, error: null }),
    ),
    remove: vi.fn<(paths: string[]) => Promise<{ data: unknown; error: unknown }>>(async () => ({
      data: [],
      error: null,
    })),
  };
  const storage = { from: vi.fn(() => bucket) };
  return { client: { rpc, storage } as unknown as SupabaseClient, rpc, bucket, storage };
}

function replace(): UpdateOwnPoemInput["illustration"] {
  const file = new File([new Uint8Array(PNG_BYTES)], FILE_NAME, { type: "image/png" });
  return { kind: "replace", file: { file, type: "png" } };
}

function input(overrides: Partial<UpdateOwnPoemInput> = {}): UpdateOwnPoemInput {
  return {
    authorId: AUTHOR_ID,
    poemId: POEM_ID,
    title: TITLE,
    text: TEXT,
    genreId: "lyric",
    illustration: { kind: "keep" },
    ...overrides,
  };
}

/** Every argument of every console call, joined: what a log line could leak. */
function loggedText(): string {
  const calls = [...vi.mocked(console.error).mock.calls, ...vi.mocked(console.warn).mock.calls];
  return calls.flat().map((part) => (typeof part === "string" ? part : JSON.stringify(part))).join("\n");
}

// implements NFR-5 of edit-poem
function expectNoPoemContentLogged(): void {
  const logged = loggedText();
  for (const secret of [TITLE, TEXT, FILE_NAME, USER_ID, AUTHOR_ID, POEM_ID, OLD_PATH]) {
    expect(logged).not.toContain(secret);
  }
}

describe("updateOwnPoem", () => {
  let supabase: ReturnType<typeof createFakeSupabase>;

  beforeEach(() => {
    supabase = createFakeSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase.client);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-6 of edit-poem
  it("keeps the illustration: uploads nothing and sends keep_illustration with no path", async () => {
    await expect(updateOwnPoem(input())).resolves.toEqual({ ok: true, status: "updated", replacedPath: null });

    expect(supabase.bucket.upload).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledExactlyOnceWith("update_my_poem", {
      poem_id: POEM_ID,
      title: TITLE,
      text: TEXT,
      genre_id: "lyric",
      keep_illustration: true,
      illustration_path: null,
    });
  });

  // implements FR-4 of edit-poem
  it("removes the illustration: uploads nothing, sends a null path, and returns the replaced path", async () => {
    supabase.rpc.mockResolvedValue(ok({ status: "updated", author_id: AUTHOR_ID, replaced_path: OLD_PATH }));

    await expect(updateOwnPoem(input({ illustration: { kind: "remove" }, genreId: null }))).resolves.toEqual({
      ok: true,
      status: "updated",
      replacedPath: OLD_PATH,
    });

    expect(supabase.bucket.upload).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith(
      "update_my_poem",
      expect.objectContaining({ genre_id: null, keep_illustration: false, illustration_path: null }),
    );
    // The old file is the action's to remove, after the tag.
    expect(supabase.bucket.remove).not.toHaveBeenCalled();
  });

  // implements FR-4 of edit-poem
  it("replaces the illustration: uploads into the author's folder, then sends the new path", async () => {
    supabase.rpc.mockResolvedValue(ok({ status: "updated", author_id: AUTHOR_ID, replaced_path: OLD_PATH }));

    await expect(updateOwnPoem(input({ illustration: replace() }))).resolves.toEqual({
      ok: true,
      status: "updated",
      replacedPath: OLD_PATH,
    });

    expect(supabase.storage.from).toHaveBeenCalledWith(BUCKET);
    const [path, , options] = supabase.bucket.upload.mock.calls[0];
    expect(path).toMatch(NEW_PATH);
    expect(options).toEqual({ contentType: "image/png", upsert: false });
    expect(supabase.rpc).toHaveBeenCalledWith(
      "update_my_poem",
      expect.objectContaining({ keep_illustration: false, illustration_path: path }),
    );
    expect(supabase.bucket.upload.mock.invocationCallOrder[0]).toBeLessThan(supabase.rpc.mock.invocationCallOrder[0]);
    expect(supabase.bucket.remove).not.toHaveBeenCalled();
  });

  // implements FR-10 of edit-poem
  it("passes not-found through without a log line", async () => {
    supabase.rpc.mockResolvedValue(ok({ status: "not-found" }));

    await expect(updateOwnPoem(input())).resolves.toEqual({ ok: true, status: "not-found" });
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements FR-4, FR-10 of edit-poem
  it("removes the new upload on not-found", async () => {
    supabase.rpc.mockResolvedValue(ok({ status: "not-found" }));

    await expect(updateOwnPoem(input({ illustration: replace() }))).resolves.toEqual({ ok: true, status: "not-found" });

    const [path] = supabase.bucket.upload.mock.calls[0];
    expect(supabase.bucket.remove).toHaveBeenCalledExactlyOnceWith([path]);
  });

  // implements FR-4, NFR-5 of edit-poem
  it("removes the new upload, never the old file, when the RPC fails, and logs no poem content", async () => {
    supabase.rpc.mockResolvedValue(rpcError("XX000", HTTP_UNAVAILABLE));

    await expect(updateOwnPoem(input({ illustration: replace() }))).resolves.toEqual({
      ok: false,
      failure: "unavailable",
    });

    const [path] = supabase.bucket.upload.mock.calls[0];
    expect(supabase.bucket.remove).toHaveBeenCalledExactlyOnceWith([path]);
    expect(supabase.bucket.remove).not.toHaveBeenCalledWith([OLD_PATH]);
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[poem-management] update poem failed: PostgrestError XX000");
    expectNoPoemContentLogged();
  });

  // implements FR-4, NFR-5 of edit-poem
  it("keeps the RPC failure when removing the new upload fails too, logging the kind only", async () => {
    supabase.rpc.mockResolvedValue(rpcError("XX000", HTTP_UNAVAILABLE));
    supabase.bucket.remove.mockResolvedValue({ data: null, error: { name: "StorageApiError", statusCode: "500" } });

    await expect(updateOwnPoem(input({ illustration: replace() }))).resolves.toEqual({
      ok: false,
      failure: "unavailable",
    });
    expect(console.error).toHaveBeenCalledWith("[poem-management] remove illustration failed: StorageApiError");
    expectNoPoemContentLogged();
  });

  // implements FR-4, NFR-5 of edit-poem
  it.each([
    ["an upload error", () => ({ data: null, error: { name: "StorageUnknownError" } }), "unavailable"],
    ["an upload that throws", () => Promise.reject(new TypeError("fetch failed")), "unavailable"],
  ] as const)("calls no RPC on %s", async (_case, upload, failure) => {
    supabase.bucket.upload.mockImplementation(async () => upload());

    await expect(updateOwnPoem(input({ illustration: replace() }))).resolves.toEqual({ ok: false, failure });
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.bucket.remove).not.toHaveBeenCalled();
    expectNoPoemContentLogged();
  });

  // implements FR-9, NFR-5 of edit-poem
  it.each([
    ["a rejected JWT", rpcError("PGRST301", HTTP_UNAUTHORIZED), "unauthenticated"],
    ["a 5xx", rpcError("XX000", HTTP_UNAVAILABLE), "unavailable"],
    ["a network failure", rpcError("", NO_RESPONSE), "unavailable"],
    ["a path outside the author's folder", rpcError("23514", HTTP_BAD_REQUEST), "unknown"],
    // implements FR-14 of admin-moderation
    ["a blocked account (AM001)", rpcError("AM001", HTTP_BAD_REQUEST), "restricted"],
  ] as const)("classifies %s", async (_case, response, failure) => {
    supabase.rpc.mockResolvedValue(response);

    await expect(updateOwnPoem(input())).resolves.toEqual({ ok: false, failure });
    expect(console.error).toHaveBeenCalledOnce();
    expectNoPoemContentLogged();
  });

  it.each([
    ["no data", null],
    ["an unknown status", { status: "deleted" }],
    ["updated without an author", { status: "updated", replaced_path: null }],
  ])("is unknown for %s, removing the new upload", async (_case, data) => {
    supabase.rpc.mockResolvedValue(ok(data));

    await expect(updateOwnPoem(input({ illustration: replace() }))).resolves.toEqual({ ok: false, failure: "unknown" });
    expect(supabase.bucket.remove).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[poem-management] update poem failed: ZodError");
  });

  it("is unknown for an RPC that throws", async () => {
    supabase.rpc.mockRejectedValue(new Error(`boom ${TITLE}`));

    await expect(updateOwnPoem(input())).resolves.toEqual({ ok: false, failure: "unknown" });
    expectNoPoemContentLogged();
  });

  // The row is written and points at the upload, so the upload must stay.
  it("is unknown when the database answers another author, keeping the upload", async () => {
    supabase.rpc.mockResolvedValue(ok({ status: "updated", author_id: OTHER_AUTHOR_ID, replaced_path: OLD_PATH }));

    await expect(updateOwnPoem(input({ illustration: replace() }))).resolves.toEqual({ ok: false, failure: "unknown" });
    expect(supabase.bucket.remove).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[poem-management] update poem failed: author mismatch");
    expect(loggedText()).not.toContain(OTHER_AUTHOR_ID);
  });

  it("is unavailable without a log line when Supabase isn't configured", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

    await expect(updateOwnPoem(input({ illustration: replace() }))).resolves.toEqual({
      ok: false,
      failure: "unavailable",
    });
    expect(console.error).not.toHaveBeenCalled();
  });
});
