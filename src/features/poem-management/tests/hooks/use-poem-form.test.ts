import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PoemGenre } from "@/features/poems";

import { usePoemForm } from "../../hooks/use-poem-form";
import type { PoemFormValues } from "../../model/poem-form-values";
import { POEM_FIELD_ERRORS } from "../../model/poem-management-messages";
import { GENRE_PLACEHOLDER } from "../../model/poem-management.constants";
import type { UpdatePoemFailure } from "../../model/poem-management.types";

const PREVIEW_URL = "blob:http://localhost:3000/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const STORED_URL = "http://127.0.0.1:54321/storage/v1/object/public/poem-illustrations/a/b.png";
const GENRES: readonly PoemGenre[] = [
  { id: "lyric", name: "Лирика" },
  { id: "sonnet", name: "Сонет" },
];
const STORED: PoemFormValues = {
  title: "Первый снег",
  text: "строка один\nстрока два",
  genreId: "lyric",
  illustration: { kind: "stored", url: STORED_URL },
};

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const GIF_HEADER = [...new TextEncoder().encode("GIF89a"), 0, 0, 0, 0, 0, 0];

/** A file input holding `file`, as the picker hands it over. */
function inputWith(file: File): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "file";
  Object.defineProperty(input, "files", { value: [file] });
  return input;
}

const png = () => inputWith(new File([new Uint8Array(PNG_HEADER)], "snow.png", { type: "image/png" }));
const gif = () => inputWith(new File([new Uint8Array(GIF_HEADER)], "fake.png", { type: "image/png" }));

// The hook only focuses through these; no test here renders a form.
const HOST = { isPending: false, formRef: { current: null }, alertRef: { current: null } };

function renderForm(initial: PoemFormValues = STORED) {
  return renderHook(() => usePoemForm<UpdatePoemFailure>(initial, GENRES, HOST));
}

beforeEach(() => {
  // jsdom has no object URLs.
  URL.createObjectURL = vi.fn(() => PREVIEW_URL);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("usePoemForm", () => {
  // implements FR-3 of edit-poem
  it("starts from the initial values, unchanged, and turns changed on an edit", () => {
    const { result } = renderForm();
    expect(result.current.values).toEqual(STORED);
    expect(result.current.isChanged).toBe(false);

    act(() => result.current.setTitle("Второй снег"));
    expect(result.current.isChanged).toBe(true);
  });

  // implements FR-4 of edit-poem
  it("ends in none, not back at the stored illustration, when a newly picked file is removed", async () => {
    const { result } = renderForm();

    act(() => result.current.chooseIllustration(png()));
    await waitFor(() => expect(result.current.values.illustration.kind).toBe("new"));
    expect(result.current.isChanged).toBe(true);

    act(() => result.current.removeIllustration());
    expect(result.current.values.illustration).toEqual({ kind: "none" });
    expect(result.current.isChanged).toBe(true);
  });

  // implements FR-3 of edit-poem
  it("keeps the stored illustration and stays unchanged after a rejected pick", async () => {
    const { result } = renderForm();

    act(() => result.current.chooseIllustration(gif()));
    await waitFor(() => expect(result.current.illustrationError).toBe(POEM_FIELD_ERRORS.illustrationUnsupportedType));
    expect(result.current.values.illustration).toEqual(STORED.illustration);
    expect(result.current.isChanged).toBe(false);
  });

  // implements FR-3 of edit-poem
  it("resets the drafts, the stored illustration, the errors, and the failure to the initial state", async () => {
    const { result } = renderForm();
    act(() => {
      result.current.setTitle("");
      result.current.setText("другой текст");
      result.current.setGenreId(GENRE_PLACEHOLDER);
      result.current.removeIllustration();
    });
    act(() => {
      result.current.validate();
      result.current.showFailure("unavailable");
    });
    expect(result.current.fieldErrors.title).toBe(POEM_FIELD_ERRORS.required);
    const { editorKey, pickerKey } = result.current.rendering;

    act(() => result.current.reset());

    expect(result.current.values).toEqual(STORED);
    expect(result.current.isChanged).toBe(false);
    expect(result.current.fieldErrors).toEqual({});
    expect(result.current.failure).toBeNull();
    // The editor and the file input remount, so they forget their own state too.
    expect(result.current.rendering.editorKey).not.toBe(editorKey);
    expect(result.current.rendering.pickerKey).not.toBe(pickerKey);
  });

  it("drops a genre the server reports as removed and resets the dropdown to «—»", () => {
    const { result } = renderForm();

    act(() => result.current.showFieldErrors({ genreId: POEM_FIELD_ERRORS.genreUnavailable }));

    expect(result.current.genres).toEqual([{ id: "sonnet", name: "Сонет" }]);
    expect(result.current.values.genreId).toBe(GENRE_PLACEHOLDER);
  });
});
