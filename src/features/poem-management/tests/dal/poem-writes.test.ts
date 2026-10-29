// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { checkCanCreatePoem, createOwnPoem } from "../../dal/poem-writes";
import type { CreateOwnPoemInput } from "../../model/poem-management.types";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const HTTP_UNAVAILABLE = 503;

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const POEM_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const TITLE = "Секрет";
const TEXT = "тайна";
const FILE_NAME = "my-private-name.png";

const BUCKET = "poem-illustrations";
const ILLUSTRATION_PATH = new RegExp(`^${AUTHOR_ID}/[0-9a-f-]{36}\\.(png|jpg)$`);

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
  return { data: null, error: { code, message: `failing row contains (${TITLE}, ${TEXT})` }, status };
}

/** A Supabase client double: `rpc` answers per function name; the bucket's methods are `vi.fn`s. */
function createFakeSupabase() {
  const responses = new Map<string, RpcResponse>();
  const rpc = vi.fn<(fn: string, args?: unknown) => Promise<RpcResponse>>(
    async (fn) => responses.get(fn) ?? ok(null),
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
  return {
    client: { rpc, storage } as unknown as SupabaseClient,
    rpc,
    bucket,
    storage,
    onRpc(fn: string, response: RpcResponse) {
      responses.set(fn, response);
    },
  };
}

const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function pngFile(): File {
  // The browser-supplied type is wrong on purpose: the stored type comes from the sniffed type.
  return new File([new Uint8Array(PNG_BYTES)], FILE_NAME, { type: "image/gif" });
}

function input(overrides: Partial<CreateOwnPoemInput> = {}): CreateOwnPoemInput {
  return { authorId: AUTHOR_ID, title: TITLE, text: TEXT, genreId: "lyric", illustration: null, ...overrides };
}

/** Every argument of every console call, joined: what a log line could leak. */
function loggedText(): string {
  const calls = [...vi.mocked(console.error).mock.calls, ...vi.mocked(console.warn).mock.calls];
  return calls.flat().map((part) => (typeof part === "string" ? part : JSON.stringify(part))).join("\n");
}

function expectNoPoemContentLogged(): void {
  const logged = loggedText();
  for (const secret of [TITLE, TEXT, FILE_NAME, USER_ID, AUTHOR_ID, POEM_ID]) expect(logged).not.toContain(secret);
}

describe("poem writes", () => {
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

  describe("checkCanCreatePoem", () => {
    // implements FR-6 of add-poem-creation
    it.each(["allowed", "not-public", "over-limit"] as const)("passes the %s status through", async (status) => {
      supabase.onRpc("can_create_poem", ok({ status }));

      await expect(checkCanCreatePoem()).resolves.toEqual({ ok: true, status });
      expect(supabase.rpc).toHaveBeenCalledExactlyOnceWith("can_create_poem");
    });

    it("is unknown for an unexpected shape", async () => {
      supabase.onRpc("can_create_poem", ok({ status: "maybe" }));

      await expect(checkCanCreatePoem()).resolves.toEqual({ ok: false, failure: "unknown" });
      expect(console.error).toHaveBeenCalledWith("[poem-management] check poem limit failed: ZodError");
    });

    it.each([
      ["an expired session", HTTP_UNAUTHORIZED, "unauthenticated"],
      ["an outage", HTTP_UNAVAILABLE, "unavailable"],
    ] as const)("classifies %s", async (_case, status, failure) => {
      supabase.onRpc("can_create_poem", rpcError("XX000", status));

      await expect(checkCanCreatePoem()).resolves.toEqual({ ok: false, failure });
      expectNoPoemContentLogged();
    });

    it("is unavailable without a log line when Supabase isn't configured", async () => {
      vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

      await expect(checkCanCreatePoem()).resolves.toEqual({ ok: false, failure: "unavailable" });
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe("createOwnPoem", () => {
    // implements FR-5 of add-poem-creation
    it("creates a poem without an illustration and uploads nothing", async () => {
      supabase.onRpc("create_my_poem", ok({ status: "created", id: POEM_ID }));

      await expect(createOwnPoem(input())).resolves.toEqual({ ok: true, poemId: POEM_ID });
      expect(supabase.bucket.upload).not.toHaveBeenCalled();
      expect(supabase.rpc).toHaveBeenCalledExactlyOnceWith("create_my_poem", {
        title: TITLE,
        text: TEXT,
        genre_id: "lyric",
        illustration_path: null,
      });
    });

    // implements FR-5, NFR-1 of add-poem-creation
    it("uploads the illustration into the author's folder under the sniffed type, then stores its path", async () => {
      supabase.onRpc("create_my_poem", ok({ status: "created", id: POEM_ID }));

      const result = await createOwnPoem(input({ genreId: null, illustration: { file: pngFile(), type: "png" } }));

      expect(result).toEqual({ ok: true, poemId: POEM_ID });
      expect(supabase.storage.from).toHaveBeenCalledWith(BUCKET);
      const [path, body, options] = supabase.bucket.upload.mock.calls[0];
      expect(path).toMatch(ILLUSTRATION_PATH);
      expect(path.endsWith(".png")).toBe(true);
      expect(body.type).toBe("image/png");
      expect(options).toEqual({ contentType: "image/png", upsert: false });
      expect(supabase.rpc).toHaveBeenCalledWith("create_my_poem", expect.objectContaining({ illustration_path: path, genre_id: null }));
      expect(supabase.bucket.remove).not.toHaveBeenCalled();
    });

    it("names a JPEG upload .jpg", async () => {
      supabase.onRpc("create_my_poem", ok({ status: "created", id: POEM_ID }));

      await createOwnPoem(input({ illustration: { file: pngFile(), type: "jpeg" } }));

      const [path, , options] = supabase.bucket.upload.mock.calls[0];
      expect(path.endsWith(".jpg")).toBe(true);
      expect(options).toEqual({ contentType: "image/jpeg", upsert: false });
    });

    // implements FR-5 of add-poem-creation
    it("calls no RPC when the upload fails", async () => {
      supabase.bucket.upload.mockResolvedValue({ data: null, error: { name: "StorageUnknownError" } });

      const result = await createOwnPoem(input({ illustration: { file: pngFile(), type: "png" } }));

      expect(result).toEqual({ ok: false, failure: "unavailable" });
      expect(supabase.rpc).not.toHaveBeenCalled();
      expectNoPoemContentLogged();
    });

    it("calls no RPC when the upload throws", async () => {
      supabase.bucket.upload.mockRejectedValue(new TypeError("fetch failed"));

      const result = await createOwnPoem(input({ illustration: { file: pngFile(), type: "png" } }));

      expect(result).toEqual({ ok: false, failure: "unavailable" });
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    // implements FR-5, NFR-10 of add-poem-creation
    it("removes the upload when the RPC fails, and logs no poem content", async () => {
      supabase.onRpc("create_my_poem", rpcError("23514", HTTP_UNAVAILABLE));

      const result = await createOwnPoem(input({ illustration: { file: pngFile(), type: "png" } }));

      expect(result).toEqual({ ok: false, failure: "unavailable" });
      const [path] = supabase.bucket.upload.mock.calls[0];
      expect(supabase.bucket.remove).toHaveBeenCalledExactlyOnceWith([path]);
      expect(console.error).toHaveBeenCalledWith("[poem-management] create poem failed: PostgrestError 23514");
      expectNoPoemContentLogged();
    });

    // implements FR-6 of add-poem-creation
    it("is too-many-poems on over-limit (a race) and removes the upload", async () => {
      supabase.onRpc("create_my_poem", ok({ status: "over-limit" }));

      const result = await createOwnPoem(input({ illustration: { file: pngFile(), type: "png" } }));

      expect(result).toEqual({ ok: false, failure: "too-many-poems" });
      expect(supabase.bucket.remove).toHaveBeenCalledOnce();
    });

    it("is unknown on not-public", async () => {
      supabase.onRpc("create_my_poem", ok({ status: "not-public" }));

      await expect(createOwnPoem(input())).resolves.toEqual({ ok: false, failure: "unknown" });
    });

    it("is unknown for an unexpected shape, removing the upload", async () => {
      supabase.onRpc("create_my_poem", ok({ status: "created", id: "not-a-uuid" }));

      const result = await createOwnPoem(input({ illustration: { file: pngFile(), type: "png" } }));

      expect(result).toEqual({ ok: false, failure: "unknown" });
      expect(supabase.bucket.remove).toHaveBeenCalledOnce();
    });

    it("keeps the RPC failure when the cleanup fails too", async () => {
      supabase.onRpc("create_my_poem", rpcError("XX000", HTTP_UNAVAILABLE));
      supabase.bucket.remove.mockResolvedValueOnce({ data: null, error: { name: "StorageApiError", statusCode: "500" } });

      const result = await createOwnPoem(input({ illustration: { file: pngFile(), type: "png" } }));

      expect(result).toEqual({ ok: false, failure: "unavailable" });
      expect(console.error).toHaveBeenCalledWith("[poem-management] remove illustration failed: StorageApiError");
    });

    it("keeps the RPC failure when the cleanup throws", async () => {
      supabase.rpc.mockRejectedValueOnce(new TypeError("fetch failed"));
      supabase.bucket.remove.mockRejectedValueOnce(new TypeError("fetch failed"));

      const result = await createOwnPoem(input({ illustration: { file: pngFile(), type: "png" } }));

      expect(result).toEqual({ ok: false, failure: "unavailable" });
      expect(console.error).toHaveBeenCalledWith("[poem-management] remove illustration failed: TypeError");
    });

    it("is unavailable when Supabase isn't configured", async () => {
      vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

      await expect(createOwnPoem(input())).resolves.toEqual({ ok: false, failure: "unavailable" });
    });
  });
});
