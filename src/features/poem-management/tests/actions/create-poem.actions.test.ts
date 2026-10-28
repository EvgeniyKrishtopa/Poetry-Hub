// @vitest-environment node
import { updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";
import { listPoemGenres } from "@/features/poems";

import { createPoemAction } from "../../actions/create-poem.actions";
import { checkCanCreatePoem, createOwnPoem } from "../../dal/poem-writes";
import { POEM_FIELD_ERRORS } from "../../model/poem-management-messages";
import { NO_GENRE } from "../../model/poem-management.constants";

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("@/features/authors", () => ({ getOwnPublicAuthor: vi.fn() }));
vi.mock("@/features/poems", () => ({
  listPoemGenres: vi.fn(),
  poemsTag: (authorId: string) => `poems:${authorId}`,
}));
vi.mock("../../dal/poem-writes", () => ({ checkCanCreatePoem: vi.fn(), createOwnPoem: vi.fn() }));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const POEM_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const GENRE_ID = "lyric";
const TITLE = "Первый снег";
const TEXT = "строка один\nстрока два";

const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const GIF_BYTES = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0];
const OVERSIZED_BYTES = 6 * 1024 * 1024;

function file(bytes: readonly number[] | Uint8Array, name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

const VALID = { title: `  ${TITLE}  `, text: TEXT, genreId: GENRE_ID };

/** Nothing past the given step ran: no write, no tag expiry. */
function expectNothingWritten(): void {
  expect(createOwnPoem).not.toHaveBeenCalled();
  expect(updateTag).not.toHaveBeenCalled();
}

describe("createPoemAction", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: USER_ID });
    vi.mocked(checkCanCreatePoem).mockResolvedValue({ ok: true, status: "allowed" });
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "public", authorId: AUTHOR_ID });
    vi.mocked(listPoemGenres).mockResolvedValue({ ok: true, genres: [{ id: GENRE_ID, name: "Лирика" }] });
    vi.mocked(createOwnPoem).mockResolvedValue({ ok: true, poemId: POEM_ID });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-5, FR-12 of add-poem-creation
  it("creates the trimmed poem, expires the author's poems tag once, and returns the id", async () => {
    const result = await createPoemAction(VALID);

    expect(result.data).toEqual({ status: "created", poemId: POEM_ID });
    expect(createOwnPoem).toHaveBeenCalledExactlyOnceWith({
      authorId: AUTHOR_ID,
      title: TITLE,
      text: TEXT,
      genreId: GENRE_ID,
      illustration: null,
    });
    expect(updateTag).toHaveBeenCalledExactlyOnceWith(`poems:${AUTHOR_ID}`);
  });

  // implements FR-5 of add-poem-creation
  it("stores «Без жанра» as no genre without reading the genre list", async () => {
    await createPoemAction({ ...VALID, genreId: NO_GENRE });

    expect(listPoemGenres).not.toHaveBeenCalled();
    expect(createOwnPoem).toHaveBeenCalledWith(expect.objectContaining({ genreId: null }));
  });

  // implements FR-5 of add-poem-creation
  it("passes a checked illustration with its sniffed type", async () => {
    const illustration = file(PNG_BYTES, "picture.jpg", "image/jpeg");

    await createPoemAction({ ...VALID, illustration });

    expect(createOwnPoem).toHaveBeenCalledWith(
      expect.objectContaining({ illustration: { file: illustration, type: "png" } }),
    );
  });

  it("treats an empty file as no illustration", async () => {
    await createPoemAction({ ...VALID, illustration: file([], "", "application/octet-stream") });

    expect(createOwnPoem).toHaveBeenCalledWith(expect.objectContaining({ illustration: null }));
  });

  // implements FR-4, FR-5 of add-poem-creation
  it("returns field errors in its own result for invalid input, with no session check or RPC call", async () => {
    const result = await createPoemAction({ title: "   ", text: "", genreId: "" });

    expect(result.validationErrors).toBeUndefined();
    expect(result.data).toEqual({
      status: "invalid",
      fieldErrors: {
        title: POEM_FIELD_ERRORS.required,
        text: POEM_FIELD_ERRORS.required,
        genreId: POEM_FIELD_ERRORS.required,
      },
    });
    expect(getSessionState).not.toHaveBeenCalled();
    expect(checkCanCreatePoem).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  // implements FR-5 of add-poem-creation
  it("returns unauthenticated when there is no session", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });

    const result = await createPoemAction(VALID);

    expect(result.data).toEqual({ status: "failed", failure: "unauthenticated" });
    expect(checkCanCreatePoem).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it("returns unavailable when the session can't be checked", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });

    const result = await createPoemAction(VALID);

    expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
    expectNothingWritten();
  });

  // implements FR-6 of add-poem-creation
  it("stops over the limit before reading the profile, calling Contentful, or uploading", async () => {
    vi.mocked(checkCanCreatePoem).mockResolvedValue({ ok: true, status: "over-limit" });

    const result = await createPoemAction({ ...VALID, illustration: file(PNG_BYTES, "a.png", "image/png") });

    expect(result.data).toEqual({ status: "failed", failure: "too-many-poems" });
    expect(getOwnPublicAuthor).not.toHaveBeenCalled();
    expect(listPoemGenres).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it("returns unknown when the limit check finds the profile not public", async () => {
    vi.mocked(checkCanCreatePoem).mockResolvedValue({ ok: true, status: "not-public" });

    const result = await createPoemAction(VALID);

    expect(result.data).toEqual({ status: "failed", failure: "unknown" });
    expectNothingWritten();
  });

  it("passes a failed limit check through", async () => {
    vi.mocked(checkCanCreatePoem).mockResolvedValue({ ok: false, failure: "unavailable" });

    const result = await createPoemAction(VALID);

    expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
    expectNothingWritten();
  });

  it("passes a failed profile read through", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: false, failure: "unauthenticated" });

    const result = await createPoemAction(VALID);

    expect(result.data).toEqual({ status: "failed", failure: "unauthenticated" });
    expectNothingWritten();
  });

  it("returns unknown when the profile read finds it not public", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "not-public" });

    const result = await createPoemAction(VALID);

    expect(result.data).toEqual({ status: "failed", failure: "unknown" });
    expectNothingWritten();
  });

  // implements FR-4 of add-poem-creation
  it("returns the genre field error for a genre no longer in the list", async () => {
    const result = await createPoemAction({ ...VALID, genreId: "sonnet" });

    expect(result.data).toEqual({
      status: "invalid",
      fieldErrors: { genreId: POEM_FIELD_ERRORS.genreUnavailable },
    });
    expectNothingWritten();
  });

  it("returns unavailable when the genre list can't be read", async () => {
    vi.mocked(listPoemGenres).mockResolvedValue({ ok: false, reason: "unavailable" });

    const result = await createPoemAction(VALID);

    expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
    expectNothingWritten();
  });

  // implements FR-4 of add-poem-creation
  it.each([
    ["a file of another type", file(GIF_BYTES, "renamed.png", "image/png"), POEM_FIELD_ERRORS.illustrationUnsupportedType],
    ["a file over 5 MB", file(new Uint8Array(OVERSIZED_BYTES), "big.png", "image/png"), POEM_FIELD_ERRORS.illustrationTooLarge],
  ])("returns the illustration field error for %s, with no upload", async (_case, illustration, message) => {
    const result = await createPoemAction({ ...VALID, illustration });

    expect(result.data).toEqual({ status: "invalid", fieldErrors: { illustration: message } });
    expectNothingWritten();
  });

  // implements FR-6 of add-poem-creation
  it("returns too-many-poems when the database's own check catches a race", async () => {
    vi.mocked(createOwnPoem).mockResolvedValue({ ok: false, failure: "too-many-poems" });

    const result = await createPoemAction(VALID);

    expect(result.data).toEqual({ status: "failed", failure: "too-many-poems" });
    expect(updateTag).not.toHaveBeenCalled();
  });

  // implements FR-12 of add-poem-creation
  it("expires no tag when the write fails", async () => {
    vi.mocked(createOwnPoem).mockResolvedValue({ ok: false, failure: "unavailable" });

    const result = await createPoemAction(VALID);

    expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("ignores any author id in the input", async () => {
    await createPoemAction({ ...VALID, authorId: "someone-else" } as never);

    expect(createOwnPoem).toHaveBeenCalledWith(expect.objectContaining({ authorId: AUTHOR_ID }));
  });
});
