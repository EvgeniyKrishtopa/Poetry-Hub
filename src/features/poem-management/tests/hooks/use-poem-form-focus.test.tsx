import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateImageFile } from "@/shared/lib/image-file/validate-image-file";

import { PoemFormFields } from "../../components/PoemForm/PoemFormFields";
import { usePoemForm } from "../../hooks/use-poem-form";
import type { PoemFormState } from "../../hooks/use-poem-form.types";
import type { PoemFormValues } from "../../model/poem-form-values";
import { NEW_POEM_ILLUSTRATION_LABELS, POEM_FIELD_ERRORS } from "../../model/poem-management-messages";
import { GENRE_PLACEHOLDER } from "../../model/poem-management.constants";

// The real check by default; a test overrides one call to control its result.
vi.mock("@/shared/lib/image-file/validate-image-file", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/shared/lib/image-file/validate-image-file")>();
  return { validateImageFile: vi.fn(original.validateImageFile) };
});

const PREVIEW_URL = "blob:http://localhost:3000/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const VALID: PoemFormValues = {
  title: "Первый снег",
  text: "строка один",
  genreId: "lyric",
  illustration: { kind: "none" },
};
const GENRES = [{ id: "lyric", name: "Лирика" }] as const;

type FormProbe = { current: PoemFormState<"unknown"> | null };

/** The form's latest state, read by the test to call the hook's actions. */
const probe: FormProbe = { current: null };

function latest(): PoemFormState<"unknown"> {
  if (probe.current === null) throw new Error("the harness has not rendered");
  return probe.current;
}

/** A form with only the shared fields and the alert wrapper: what both real forms render around the hook. */
function Harness({ initial, stateRef }: { readonly initial: PoemFormValues; readonly stateRef: FormProbe }) {
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const form = usePoemForm<"unknown">(initial, GENRES, { isPending: false, formRef, alertRef });
  useEffect(() => {
    stateRef.current = form;
  });
  return (
    <form ref={formRef}>
      <PoemFormFields fields={form} illustrationLabels={NEW_POEM_ILLUSTRATION_LABELS} illustrationLayout="picker-first" />
      {form.failure !== null && <div ref={alertRef} tabIndex={-1} data-testid="alert" />}
    </form>
  );
}

function renderHarness(initial: PoemFormValues) {
  render(<Harness initial={initial} stateRef={probe} />);
}

beforeEach(() => {
  // jsdom has no object URLs.
  URL.createObjectURL = vi.fn(() => PREVIEW_URL);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.resetAllMocks();
  probe.current = null;
});

// implements FR-3 of edit-poem (the shared form's checks, reused by the edit form)
describe("usePoemForm focus", () => {
  it("focuses the first invalid field when the browser check fails, and returns false", () => {
    renderHarness({ ...VALID, title: "", genreId: GENRE_PLACEHOLDER });

    let ok = true;
    act(() => {
      ok = latest().validate();
    });

    expect(ok).toBe(false);
    expect(screen.getByLabelText("Название произведения")).toHaveFocus();
    expect(latest().fieldErrors.genreId).toBe(POEM_FIELD_ERRORS.required);
  });

  it("passes the browser check for valid drafts without focusing anything", () => {
    renderHarness(VALID);

    let ok = false;
    act(() => {
      ok = latest().validate();
    });

    expect(ok).toBe(true);
    expect(document.body).toHaveFocus();
  });

  it("shows a server field error under its field and focuses it", () => {
    renderHarness(VALID);

    act(() => latest().showFieldErrors({ text: "Не более 10000 символов." }));

    expect(latest().fieldErrors.text).toBe("Не более 10000 символов.");
    expect(screen.getByLabelText("Текст произведения")).toHaveFocus();
  });

  it("focuses the failure alert", () => {
    renderHarness(VALID);

    act(() => latest().showFailure("unknown"));

    expect(screen.getByTestId("alert")).toHaveFocus();
  });

  it("focuses the illustration when the picked file no longer passes right before sending", async () => {
    const user = userEvent.setup();
    renderHarness(VALID);
    const input = screen.getByLabelText("Иллюстрация (необязательно)");
    await user.upload(input, new File([new Uint8Array(PNG_HEADER)], "snow.png", { type: "image/png" }));
    await screen.findByRole("presentation");
    vi.mocked(validateImageFile).mockResolvedValueOnce({ ok: false, error: "too-large" });

    let ok = true;
    await act(async () => {
      ok = await latest().recheckIllustration();
    });

    expect(ok).toBe(false);
    expect(latest().illustrationError).toBe(POEM_FIELD_ERRORS.illustrationTooLarge);
    expect(input).toHaveFocus();
  });

  it("passes the recheck when no file was picked", async () => {
    renderHarness(VALID);

    await expect(latest().recheckIllustration()).resolves.toBe(true);
    expect(validateImageFile).not.toHaveBeenCalled();
  });
});
