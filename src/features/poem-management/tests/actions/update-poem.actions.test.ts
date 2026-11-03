// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";
import { listPoemGenres, poemsTag } from "@/features/poems";
import { validateImageFile } from "@/shared/lib/image-file/validate-image-file";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { updatePoemAction } from "../../actions/update-poem.actions";
import { consumePoemEditAllowance } from "../../dal/poem-edit-allowance";
import { updateOwnPoem } from "../../dal/poem-update";
import { POEM_FIELD_ERRORS } from "../../model/poem-management-messages";
import { NO_GENRE, TEXT_MAX_LENGTH } from "../../model/poem-management.constants";

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("@/features/authors", () => ({ getOwnPublicAuthor: vi.fn() }));
vi.mock("@/features/poems", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/poems")>()),
  listPoemGenres: vi.fn(),
}));
vi.mock("@/shared/lib/image-file/validate-image-file", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/shared/lib/image-file/validate-image-file")>();
  return { validateImageFile: vi.fn(original.validateImageFile) };
});
// The old file's removal runs for real (`illustration-cleanup.ts`) against this client's bucket.
vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("../../dal/poem-edit-allowance", () => ({ consumePoemEditAllowance: vi.fn() }));
vi.mock("../../dal/poem-update", () => ({ updateOwnPoem: vi.fn() }));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const POEM_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const GENRE_ID = "lyric";
const TITLE = "Первый снег";
const TEXT = "строка один\nстрока два";
const OLD_PATH = `${AUTHOR_ID}/0f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f.png`;

const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const GIF_BYTES = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0];

function file(bytes: readonly number[], name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

const VALID = {
  poemId: POEM_ID,
  title: `  ${TITLE}  `,
  text: TEXT,
  genreId: GENRE_ID,
  illustrationChange: "keep",
} as const;

const bucket = {
  remove: vi.fn<(paths: string[]) => Promise<{ data: unknown; error: unknown }>>(),
};

/** Nothing past the limit ran: no profile, no Contentful, no file read, no write, no tag. */
function expectNothingAfterTheLimit(): void {
  expect(getOwnPublicAuthor).not.toHaveBeenCalled();
  expect(listPoemGenres).not.toHaveBeenCalled();
  expect(validateImageFile).not.toHaveBeenCalled();
  expect(updateOwnPoem).not.toHaveBeenCalled();
  expect(updateTag).not.toHaveBeenCalled();
}

/** Every argument of every console call, joined: what a log line could leak. */
function loggedText(): string {
  const calls = [...vi.mocked(console.error).mock.calls, ...vi.mocked(console.warn).mock.calls];
  return calls.flat().map((part) => (typeof part === "string" ? part : JSON.stringify(part))).join("\n");
}

describe("updatePoemAction", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: USER_ID });
    vi.mocked(consumePoemEditAllowance).mockResolvedValue({ ok: true });
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "public", authorId: AUTHOR_ID });
    vi.mocked(listPoemGenres).mockResolvedValue({ ok: true, genres: [{ id: GENRE_ID, name: "Лирика" }] });
    vi.mocked(updateOwnPoem).mockResolvedValue({ ok: true, status: "updated", replacedPath: null });
    bucket.remove.mockResolvedValue({ data: [], error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      storage: { from: () => bucket },
    } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-6, FR-14 of edit-poem
  it("saves the trimmed poem, keeping the illustration, and expires exactly the author's tag", async () => {
    const result = await updatePoemAction(VALID);

    expect(result.data).toEqual({ status: "saved" });
    expect(updateOwnPoem).toHaveBeenCalledExactlyOnceWith({
      authorId: AUTHOR_ID,
      poemId: POEM_ID,
      title: TITLE,
      text: TEXT,
      genreId: GENRE_ID,
      illustration: { kind: "keep" },
    });
    expect(updateTag).toHaveBeenCalledExactlyOnceWith(poemsTag(AUTHOR_ID));
    expect(bucket.remove).not.toHaveBeenCalled();
  });

  // implements FR-6 of edit-poem
  it("stores «Без жанра» as no genre without reading the genre list", async () => {
    await updatePoemAction({ ...VALID, genreId: NO_GENRE });

    expect(listPoemGenres).not.toHaveBeenCalled();
    expect(updateOwnPoem).toHaveBeenCalledWith(expect.objectContaining({ genreId: null }));
  });

  // implements FR-4 of edit-poem
  it("removes the illustration, then the old file after the tag", async () => {
    vi.mocked(updateOwnPoem).mockResolvedValue({ ok: true, status: "updated", replacedPath: OLD_PATH });

    const result = await updatePoemAction({ ...VALID, illustrationChange: "remove" });

    expect(result.data).toEqual({ status: "saved" });
    expect(updateOwnPoem).toHaveBeenCalledWith(expect.objectContaining({ illustration: { kind: "remove" } }));
    expect(bucket.remove).toHaveBeenCalledExactlyOnceWith([OLD_PATH]);
    expect(vi.mocked(updateTag).mock.invocationCallOrder[0]).toBeLessThan(bucket.remove.mock.invocationCallOrder[0]);
  });

  // implements FR-4 of edit-poem
  it("replaces the illustration with the checked file and its sniffed type", async () => {
    vi.mocked(updateOwnPoem).mockResolvedValue({ ok: true, status: "updated", replacedPath: OLD_PATH });
    const illustration = file(PNG_BYTES, "picture.jpg", "image/jpeg");

    const result = await updatePoemAction({ ...VALID, illustrationChange: "replace", illustration });

    expect(result.data).toEqual({ status: "saved" });
    expect(updateOwnPoem).toHaveBeenCalledWith(
      expect.objectContaining({ illustration: { kind: "replace", file: { file: illustration, type: "png" } } }),
    );
    expect(bucket.remove).toHaveBeenCalledExactlyOnceWith([OLD_PATH]);
  });

  it("ignores a file sent with keep", async () => {
    await updatePoemAction({ ...VALID, illustration: file(PNG_BYTES, "picture.png", "image/png") });

    expect(validateImageFile).not.toHaveBeenCalled();
    expect(updateOwnPoem).toHaveBeenCalledWith(expect.objectContaining({ illustration: { kind: "keep" } }));
  });

  // implements FR-10 of edit-poem
  it("answers not-found for a malformed id before any I/O", async () => {
    const result = await updatePoemAction({ ...VALID, poemId: POEM_ID.toUpperCase() });

    expect(result.data).toEqual({ status: "not-found" });
    expect(getSessionState).not.toHaveBeenCalled();
    expect(consumePoemEditAllowance).not.toHaveBeenCalled();
    expectNothingAfterTheLimit();
  });

  // implements FR-5, FR-7 of edit-poem
  it("returns field errors for a bypassed form, counting nothing and uploading nothing", async () => {
    const result = await updatePoemAction({ ...VALID, title: "   ", text: "а".repeat(TEXT_MAX_LENGTH + 1) });

    expect(result.validationErrors).toBeUndefined();
    expect(result.data).toEqual({
      status: "invalid",
      fieldErrors: { title: POEM_FIELD_ERRORS.required, text: POEM_FIELD_ERRORS.textTooLong },
    });
    expect(getSessionState).not.toHaveBeenCalled();
    expect(consumePoemEditAllowance).not.toHaveBeenCalled();
    expectNothingAfterTheLimit();
  });

  // implements FR-4, FR-7 of edit-poem
  it.each([
    ["no file", undefined],
    ["an empty file", file([], "", "application/octet-stream")],
  ])("rejects a replace with %s on the illustration, counting nothing", async (_case, illustration) => {
    const result = await updatePoemAction({ ...VALID, illustrationChange: "replace", illustration });

    expect(result.data).toEqual({ status: "invalid", fieldErrors: { illustration: POEM_FIELD_ERRORS.required } });
    expect(consumePoemEditAllowance).not.toHaveBeenCalled();
  });

  it("reports the field rules and a missing replacement together", async () => {
    const result = await updatePoemAction({ ...VALID, title: "", illustrationChange: "replace" });

    expect(result.data).toEqual({
      status: "invalid",
      fieldErrors: { title: POEM_FIELD_ERRORS.required, illustration: POEM_FIELD_ERRORS.required },
    });
  });

  it("rejects an unknown illustration change through validationErrors, before any check runs", async () => {
    const result = await updatePoemAction({ ...VALID, illustrationChange: "swap" } as never);

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(getSessionState).not.toHaveBeenCalled();
  });

  // implements FR-9 of edit-poem
  it("returns unauthenticated when there is no session, counting nothing", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });

    const result = await updatePoemAction(VALID);

    expect(result.data).toEqual({ status: "failed", failure: "unauthenticated" });
    expect(consumePoemEditAllowance).not.toHaveBeenCalled();
    expectNothingAfterTheLimit();
  });

  // implements FR-8 of edit-poem
  it("returns unavailable when the session can't be checked", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });

    const result = await updatePoemAction(VALID);

    expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
    expect(consumePoemEditAllowance).not.toHaveBeenCalled();
  });

  // implements FR-7 of edit-poem
  it("stops over the limit before reading the profile, calling Contentful, reading the file, or uploading", async () => {
    vi.mocked(consumePoemEditAllowance).mockResolvedValue({ ok: false, failure: "too-many-saves" });

    const result = await updatePoemAction({
      ...VALID,
      illustrationChange: "replace",
      illustration: file(PNG_BYTES, "picture.png", "image/png"),
    });

    expect(result.data).toEqual({ status: "failed", failure: "too-many-saves" });
    expectNothingAfterTheLimit();
  });

  // implements FR-8 of edit-poem
  it("passes a failed limit check through", async () => {
    vi.mocked(consumePoemEditAllowance).mockResolvedValue({ ok: false, failure: "unavailable" });

    const result = await updatePoemAction(VALID);

    expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
    expectNothingAfterTheLimit();
  });

  // implements FR-8 of edit-poem
  it("passes a failed own-profile read through", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: false, failure: "unavailable" });

    const result = await updatePoemAction(VALID);

    expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
    expect(updateOwnPoem).not.toHaveBeenCalled();
  });

  // implements FR-10 of edit-poem
  it("returns not-public for a profile that is no longer public, uploading and writing nothing", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "not-public" });

    const result = await updatePoemAction({
      ...VALID,
      illustrationChange: "replace",
      illustration: file(PNG_BYTES, "picture.png", "image/png"),
    });

    expect(result.data).toEqual({ status: "failed", failure: "not-public" });
    expect(updateOwnPoem).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  // implements FR-8 of edit-poem
  it("returns unavailable when the genre list can't be read", async () => {
    vi.mocked(listPoemGenres).mockResolvedValue({ ok: false, reason: "unavailable" });

    const result = await updatePoemAction(VALID);

    expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
    expect(updateOwnPoem).not.toHaveBeenCalled();
  });

  // implements FR-7 of edit-poem
  it("returns the genre field error for a removed genre, after counting the attempt", async () => {
    vi.mocked(listPoemGenres).mockResolvedValue({ ok: true, genres: [{ id: "epic", name: "Эпос" }] });

    const result = await updatePoemAction(VALID);

    expect(result.data).toEqual({ status: "invalid", fieldErrors: { genreId: POEM_FIELD_ERRORS.genreUnavailable } });
    expect(consumePoemEditAllowance).toHaveBeenCalledOnce();
    expect(vi.mocked(consumePoemEditAllowance).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(listPoemGenres).mock.invocationCallOrder[0],
    );
    expect(updateOwnPoem).not.toHaveBeenCalled();
  });

  // implements FR-7 of edit-poem
  it("returns the illustration field error for a bad file, after counting the attempt", async () => {
    const result = await updatePoemAction({
      ...VALID,
      illustrationChange: "replace",
      illustration: file(GIF_BYTES, "picture.png", "image/png"),
    });

    expect(result.data).toEqual({
      status: "invalid",
      fieldErrors: { illustration: POEM_FIELD_ERRORS.illustrationUnsupportedType },
    });
    expect(consumePoemEditAllowance).toHaveBeenCalledOnce();
    expect(vi.mocked(consumePoemEditAllowance).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(validateImageFile).mock.invocationCallOrder[0],
    );
    expect(updateOwnPoem).not.toHaveBeenCalled();
  });

  // implements FR-8, FR-9 of edit-poem
  it.each(["unavailable", "unauthenticated", "unknown"] as const)(
    "returns a failed update (%s, including an upload failure) and expires no tag",
    async (failure) => {
      vi.mocked(updateOwnPoem).mockResolvedValue({ ok: false, failure });

      const result = await updatePoemAction(VALID);

      expect(result.data).toEqual({ status: "failed", failure });
      expect(updateTag).not.toHaveBeenCalled();
      expect(bucket.remove).not.toHaveBeenCalled();
    },
  );

  // implements FR-10 of edit-poem
  it("answers not-found when the poem is gone or another author's, expiring nothing", async () => {
    vi.mocked(updateOwnPoem).mockResolvedValue({ ok: true, status: "not-found" });

    const result = await updatePoemAction(VALID);

    expect(result.data).toEqual({ status: "not-found" });
    expect(updateTag).not.toHaveBeenCalled();
    expect(bucket.remove).not.toHaveBeenCalled();
  });

  // implements FR-4, NFR-5 of edit-poem
  it("still answers saved when the old file can't be removed, logging the kind only", async () => {
    vi.mocked(updateOwnPoem).mockResolvedValue({ ok: true, status: "updated", replacedPath: OLD_PATH });
    bucket.remove.mockResolvedValue({ data: null, error: { name: "StorageApiError", statusCode: "500" } });

    const result = await updatePoemAction({ ...VALID, illustrationChange: "remove" });

    expect(result.data).toEqual({ status: "saved" });
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[poem-management] remove illustration failed: StorageApiError");
    const logged = loggedText();
    for (const secret of [TITLE, TEXT, POEM_ID, AUTHOR_ID, USER_ID, OLD_PATH]) expect(logged).not.toContain(secret);
  });

  // implements FR-14 of edit-poem
  it("still answers saved when expiring the tag throws, and removes the old file anyway", async () => {
    vi.mocked(updateOwnPoem).mockResolvedValue({ ok: true, status: "updated", replacedPath: OLD_PATH });
    vi.mocked(updateTag).mockImplementation(() => {
      throw new Error(`tag ${AUTHOR_ID}`);
    });

    const result = await updatePoemAction({ ...VALID, illustrationChange: "remove" });

    expect(result.data).toEqual({ status: "saved" });
    expect(bucket.remove).toHaveBeenCalledExactlyOnceWith([OLD_PATH]);
    expect(loggedText()).not.toContain(AUTHOR_ID);
  });

  it("ignores any author id in the input", async () => {
    await updatePoemAction({ ...VALID, authorId: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f" } as never);

    expect(updateOwnPoem).toHaveBeenCalledWith(expect.objectContaining({ authorId: AUTHOR_ID }));
  });
});
