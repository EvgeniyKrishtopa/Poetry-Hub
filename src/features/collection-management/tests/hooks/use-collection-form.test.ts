import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useCollectionForm } from "../../hooks/use-collection-form";
import type { CollectionFormValues } from "../../model/collection-form-values";

const EMPTY: CollectionFormValues = { title: "", description: "" };
const STORED: CollectionFormValues = { title: "Осенний цикл", description: "Стихи октября" };

/** A form with the two named fields the hook focuses, attached to the document so focus works. */
function attachForm(): { readonly form: HTMLFormElement; readonly title: HTMLInputElement; readonly description: HTMLTextAreaElement } {
  const form = document.createElement("form");
  const title = document.createElement("input");
  title.name = "title";
  const description = document.createElement("textarea");
  description.name = "description";
  form.append(title, description);
  document.body.append(form);
  return { form, title, description };
}

function renderForm(initial: CollectionFormValues = EMPTY, isPending = false) {
  const elements = attachForm();
  const formRef = { current: elements.form };
  const hook = renderHook(({ pending }) => useCollectionForm(initial, { isPending: pending, formRef }), {
    initialProps: { pending: isPending },
  });
  return { ...hook, ...elements };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("useCollectionForm", () => {
  it("starts from the initial values and keeps each draft", () => {
    const { result } = renderForm(STORED);

    act(() => result.current.setTitle("Осенний цикл 2026"));
    act(() => result.current.setDescription("Стихи ноября"));

    expect(result.current.values).toEqual({ title: "Осенний цикл 2026", description: "Стихи ноября" });
  });

  // implements FR-3 of add-poem-collections
  it("answers the values on a valid form and shows no errors", () => {
    const { result } = renderForm();
    act(() => result.current.setTitle("  Осенний цикл  "));

    let check: ReturnType<typeof result.current.validate> | undefined;
    act(() => {
      check = result.current.validate();
    });

    expect(check).toEqual({ ok: true, values: { title: "  Осенний цикл  ", description: "" } });
    expect(result.current.fieldErrors).toEqual({});
  });

  // implements FR-3 of add-poem-collections
  it("shows the required error for a blank title and focuses it", () => {
    const { result, title } = renderForm();
    act(() => result.current.setTitle("   "));

    let check: ReturnType<typeof result.current.validate> | undefined;
    act(() => {
      check = result.current.validate();
    });

    expect(check).toEqual({ ok: false, fieldErrors: { title: "Обязательное поле." } });
    expect(result.current.fieldErrors.title).toBe("Обязательное поле.");
    expect(document.activeElement).toBe(title);
  });

  // implements FR-3 of add-poem-collections
  it("shows both length errors and focuses the title, the first invalid field", () => {
    const { result, title } = renderForm();
    act(() => result.current.setTitle("а".repeat(81)));
    act(() => result.current.setDescription("б".repeat(1001)));

    act(() => {
      result.current.validate();
    });

    expect(result.current.fieldErrors).toEqual({
      title: "Не более 80 символов.",
      description: "Не более 1000 символов.",
    });
    expect(document.activeElement).toBe(title);
  });

  // implements FR-3 of add-poem-collections
  it("focuses the description when only it is invalid", () => {
    const { result, description } = renderForm();
    act(() => result.current.setTitle("Осенний цикл"));
    act(() => result.current.setDescription("б".repeat(1001)));

    act(() => {
      result.current.validate();
    });

    expect(result.current.fieldErrors).toEqual({ description: "Не более 1000 символов." });
    expect(document.activeElement).toBe(description);
  });

  it("clears the errors once the form is valid again", () => {
    const { result } = renderForm();
    act(() => {
      result.current.validate();
    });
    act(() => result.current.setTitle("Осенний цикл"));

    act(() => {
      result.current.validate();
    });

    expect(result.current.fieldErrors).toEqual({});
  });

  // implements FR-4, NFR-4 of add-poem-collections
  it("waits until the send is over to focus the server's field error", () => {
    const { result, rerender, title } = renderForm(EMPTY, true);

    act(() => result.current.showFieldErrors({ title: "Обязательное поле." }));

    expect(result.current.fieldErrors).toEqual({ title: "Обязательное поле." });
    expect(document.activeElement).not.toBe(title);

    rerender({ pending: false });

    expect(document.activeElement).toBe(title);
  });

  it("focuses again when the same field is invalid on a later check", () => {
    const { result, title } = renderForm();
    act(() => {
      result.current.validate();
    });
    title.blur();

    act(() => {
      result.current.validate();
    });

    expect(document.activeElement).toBe(title);
  });

  // implements FR-8 of add-poem-collections
  it("counts as changed only when a normalized value differs", () => {
    const { result } = renderForm(STORED);
    expect(result.current.isChanged).toBe(false);

    act(() => result.current.setTitle("Осенний цикл "));
    expect(result.current.isChanged).toBe(false);

    act(() => result.current.setDescription("Стихи ноября"));
    expect(result.current.isChanged).toBe(true);
  });

  // implements FR-8 of add-poem-collections
  it("resets both drafts to the initial values and clears the errors", () => {
    const { result } = renderForm(STORED);
    act(() => result.current.setTitle(""));
    act(() => result.current.setDescription("Стихи ноября"));
    act(() => {
      result.current.validate();
    });

    act(() => result.current.reset());

    expect(result.current.values).toEqual(STORED);
    expect(result.current.fieldErrors).toEqual({});
    expect(result.current.isChanged).toBe(false);
  });
});
