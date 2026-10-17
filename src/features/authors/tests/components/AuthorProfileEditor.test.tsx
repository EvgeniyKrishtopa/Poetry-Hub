import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { deleteProfileFieldAction, saveNameAction } from "../../actions/author-profile.actions";
import { AuthorProfileEditor } from "../../components/AuthorProfileEditor/AuthorProfileEditor";
import type { AuthorProfile } from "../../model/author.types";

import { deferred } from "./deferred";

vi.mock("../../actions/author-profile.actions", () => ({
  saveNameAction: vi.fn(),
  saveAboutAction: vi.fn(),
  savePhotoAction: vi.fn(),
  deleteProfileFieldAction: vi.fn(),
}));

type NameResponse = Awaited<ReturnType<typeof saveNameAction>>;
type DeleteResponse = Awaited<ReturnType<typeof deleteProfileFieldAction>>;

const PROFILE_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

const PROFILE: AuthorProfile = {
  id: PROFILE_ID,
  firstName: "Anna",
  lastName: "Akhmatova",
  about: null,
  aboutAlign: "left",
  photoUrl: null,
};

const SAVED = { data: { status: "saved", profile: PROFILE } } as const;
const UNAVAILABLE = { data: { status: "failed", failure: "unavailable" } } as const;

afterEach(() => {
  vi.resetAllMocks();
});

function editButtons() {
  return screen.getAllByRole("button", { name: "Изменить" });
}

/** Every button that edits or deletes a field other than the first name (the last name's come last). */
function otherFieldButtons() {
  return [
    screen.getAllByRole("button", { name: "Изменить" }).at(-1),
    screen.getAllByRole("button", { name: "Удалить" }).at(-1),
    screen.getByRole("button", { name: "Добавить «О себе»" }),
    screen.getByRole("button", { name: "Добавить фото" }),
  ];
}

async function startPendingFirstNameSave(value: string) {
  const save = deferred<NameResponse>();
  vi.mocked(saveNameAction).mockReturnValue(save.promise);
  const user = userEvent.setup();
  await user.click(editButtons()[0]);
  const input = screen.getByRole("textbox", { name: "Имя" });
  await user.clear(input);
  await user.type(input, value);
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  return { save, user };
}

describe("AuthorProfileEditor", () => {
  // implements FR-2, FR-6, NFR-8 of add-author-profiles
  it("shows the four add prompts, the photo placeholder, and no public link for an empty profile", () => {
    const { container } = render(<AuthorProfileEditor profile={null} />);

    for (const prompt of ["Добавить имя", "Добавить фамилию", "Добавить «О себе»", "Добавить фото"]) {
      expect(screen.getByRole("button", { name: prompt })).toBeEnabled();
    }
    expect(container.querySelector("[data-photo-placeholder]")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Открыть публичную страницу" })).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("lang", "ru");
  });

  // implements FR-6 of add-author-profiles
  it("links «Открыть публичную страницу» to /authors/<id> for a public profile", () => {
    render(<AuthorProfileEditor profile={PROFILE} />);

    expect(screen.getByRole("link", { name: "Открыть публичную страницу" })).toHaveAttribute(
      "href",
      `/authors/${PROFILE_ID}`,
    );
  });

  // implements FR-6 of add-author-profiles
  it("edits one field at a time, and Отмена discards the draft without calling an action", async () => {
    const user = userEvent.setup();
    render(<AuthorProfileEditor profile={PROFILE} />);

    await user.click(editButtons()[0]);
    const input = screen.getByRole("textbox", { name: "Имя" });
    expect(input).toHaveValue("Anna");
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
    for (const button of otherFieldButtons()) expect(button).toBeDisabled();

    await user.clear(input);
    await user.type(input, "Anya");
    await user.click(screen.getByRole("button", { name: "Отмена" }));

    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    for (const button of otherFieldButtons()) expect(button).toBeEnabled();
    expect(saveNameAction).not.toHaveBeenCalled();
  });

  // implements FR-7 of add-author-profiles
  it("shows the submitted value with a disabled «Сохранение…» and disables the other fields while pending", async () => {
    render(<AuthorProfileEditor profile={PROFILE} />);
    const { save } = await startPendingFirstNameSave("Anya");

    expect(saveNameAction).toHaveBeenCalledWith({ field: "first_name", value: "Anya" });
    expect(screen.getByText("Anya")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Сохранение…" })).toBeDisabled();
    for (const button of otherFieldButtons()) expect(button).toBeDisabled();

    await act(async () => save.resolve(SAVED));
  });

  // implements FR-7, NFR-5 of add-author-profiles
  it("announces «Сохранено» after each successful save and empties the region while pending", async () => {
    const { rerender } = render(<AuthorProfileEditor profile={PROFILE} />);
    const status = screen.getByRole("status");

    const first = await startPendingFirstNameSave("Anya");
    expect(status).toBeEmptyDOMElement();
    await act(async () => first.save.resolve(SAVED));
    // The action's response re-renders the page with the saved value (design D3).
    rerender(<AuthorProfileEditor profile={{ ...PROFILE, firstName: "Anya" }} />);

    expect(status).toHaveTextContent("Сохранено");
    expect(screen.getByText("Anya")).toBeInTheDocument();
    expect(editButtons()[0]).toBeEnabled();
    for (const button of otherFieldButtons()) expect(button).toBeEnabled();

    const second = await startPendingFirstNameSave("Anyuta");
    expect(status).toBeEmptyDOMElement();
    await act(async () => second.save.resolve(SAVED));

    expect(status).toHaveTextContent("Сохранено");
  });

  // Next keeps a left route mounted but hidden (Cache Components); a draft survives, the notice doesn't.
  it("keeps an open draft but clears «Сохранено» when the page is hidden and shown again", async () => {
    vi.mocked(saveNameAction).mockResolvedValue(SAVED);
    const user = userEvent.setup();
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <AuthorProfileEditor profile={PROFILE} />
      </Activity>
    );
    const { rerender } = render(page("visible"));
    await user.click(editButtons()[1]);
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    // The notice is set when the action's transition settles, which a click doesn't wait for: on a slow
    // CI runner the line after it ran first.
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Сохранено"));
    await user.click(editButtons()[0]);
    await user.type(screen.getByRole("textbox", { name: "Имя" }), "-черновик");

    rerender(page("hidden"));
    rerender(page("visible"));

    expect(screen.getByRole("textbox", { name: "Имя" })).toHaveValue("Anna-черновик");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  // implements FR-7, FR-9, NFR-5 of add-author-profiles
  it("returns to edit mode with the draft and the error on a failed save, and Отмена shows the saved value", async () => {
    const user = userEvent.setup();
    render(<AuthorProfileEditor profile={PROFILE} />);
    const { save } = await startPendingFirstNameSave("Anya");

    await act(async () => save.resolve(UNAVAILABLE));

    const input = screen.getByRole("textbox", { name: "Имя" });
    expect(input).toHaveValue("Anya");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Сохранение сейчас недоступно. Попробуйте позже.");
    expect(screen.queryByText("Anna")).toBeNull();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    await user.click(screen.getByRole("button", { name: "Отмена" }));

    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.queryByText("Сохранение сейчас недоступно. Попробуйте позже.")).toBeNull();
  });

  // implements FR-8, NFR-5 of add-author-profiles
  it("shows a validation error under the field, wired to the input", async () => {
    render(<AuthorProfileEditor profile={PROFILE} />);
    const { save } = await startPendingFirstNameSave(" ");

    await act(async () =>
      save.resolve({ validationErrors: { formErrors: [], fieldErrors: { value: ["Обязательное поле."] } } }),
    );

    expect(screen.getByRole("textbox", { name: "Имя" })).toHaveAccessibleDescription("Обязательное поле.");
  });

  // implements FR-9 of add-author-profiles
  it("shows the generic error under the field when the action call itself rejects", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<AuthorProfileEditor profile={PROFILE} />);
    const { save } = await startPendingFirstNameSave("Anya");

    await act(async () => save.reject(new TypeError("Failed to fetch Anya")));

    expect(screen.getByRole("textbox", { name: "Имя" })).toHaveAccessibleDescription(
      "Что-то пошло не так. Попробуйте ещё раз.",
    );
    // Only the error's type is logged, never its message or the submitted value (NFR-3).
    expect(log).toHaveBeenCalledWith("[authors] action call rejected: TypeError");
    expect(JSON.stringify(log.mock.calls)).not.toContain("Anya");
  });

  // implements FR-10 of add-author-profiles
  it("shows the empty state with a disabled «Удаление…» while a delete is pending, and the value again on failure", async () => {
    const remove = deferred<DeleteResponse>();
    vi.mocked(deleteProfileFieldAction).mockReturnValue(remove.promise);
    const user = userEvent.setup();
    render(<AuthorProfileEditor profile={PROFILE} />);

    await user.click(screen.getAllByRole("button", { name: "Удалить" })[1]);

    expect(deleteProfileFieldAction).toHaveBeenCalledWith({ field: "last_name" });
    expect(screen.queryByText("Akhmatova")).toBeNull();
    expect(screen.getByRole("button", { name: "Удаление…" })).toBeDisabled();
    expect(editButtons()[0]).toBeDisabled();
    expect(screen.getByRole("button", { name: "Добавить фото" })).toBeDisabled();

    await act(async () => remove.resolve(UNAVAILABLE));

    expect(screen.getByText("Akhmatova")).toBeInTheDocument();
    expect(screen.getByText("Сохранение сейчас недоступно. Попробуйте позже.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Удалить" })[1]).toBeEnabled();
  });

  // implements FR-10 of add-author-profiles
  it("shows the add prompt and «Сохранено» after a successful delete", async () => {
    vi.mocked(deleteProfileFieldAction).mockResolvedValue({ data: { status: "saved", profile: PROFILE } });
    const user = userEvent.setup();
    const { rerender } = render(<AuthorProfileEditor profile={PROFILE} />);

    await user.click(screen.getAllByRole("button", { name: "Удалить" })[1]);
    rerender(<AuthorProfileEditor profile={{ ...PROFILE, lastName: null }} />);

    expect(screen.getByRole("button", { name: "Добавить фамилию" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("Сохранено");
  });

  // A switch replaces a field's subtree, so without these a keyboard user falls to the page body.
  describe("keyboard focus", () => {
    // implements NFR-5 of add-author-profiles
    it("moves focus nowhere on a first render", () => {
      render(<AuthorProfileEditor profile={PROFILE} />);

      expect(document.body).toHaveFocus();
    });

    // implements NFR-5 of add-author-profiles
    it("focuses the input on Enter at «Изменить», and «Изменить» again on «Отмена»", async () => {
      const user = userEvent.setup();
      render(<AuthorProfileEditor profile={PROFILE} />);

      editButtons()[0].focus();
      await user.keyboard("{Enter}");
      expect(screen.getByRole("textbox", { name: "Имя" })).toHaveFocus();

      await user.click(screen.getByRole("button", { name: "Отмена" }));
      expect(editButtons()[0]).toHaveFocus();
    });

    // implements NFR-5 of add-author-profiles
    it("focuses the field's «Изменить» once its save settles", async () => {
      render(<AuthorProfileEditor profile={PROFILE} />);
      const { save } = await startPendingFirstNameSave("Anya");

      await act(async () => save.resolve(SAVED));

      expect(editButtons()[0]).toHaveFocus();
    });

    // implements NFR-5 of add-author-profiles
    it("focuses the input again, with its error, when a save fails", async () => {
      render(<AuthorProfileEditor profile={PROFILE} />);
      const { save } = await startPendingFirstNameSave("Anya");

      await act(async () => save.resolve(UNAVAILABLE));

      const input = screen.getByRole("textbox", { name: "Имя" });
      expect(input).toHaveFocus();
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    // implements NFR-5 of add-author-profiles
    it("focuses the add prompt once a delete empties the field", async () => {
      const remove = deferred<DeleteResponse>();
      vi.mocked(deleteProfileFieldAction).mockReturnValue(remove.promise);
      const user = userEvent.setup();
      const { rerender } = render(<AuthorProfileEditor profile={PROFILE} />);

      await user.click(screen.getAllByRole("button", { name: "Удалить" })[0]);
      const emptied = { ...PROFILE, firstName: null };
      await act(async () => remove.resolve({ data: { status: "saved", profile: emptied } }));
      // The action's response re-renders the page with the cleared value (design D3).
      rerender(<AuthorProfileEditor profile={emptied} />);

      expect(screen.getByRole("button", { name: "Добавить имя" })).toHaveFocus();
    });

    // implements NFR-5 of add-author-profiles
    it.each([
      ["Добавить «О себе»", "О себе"],
      ["Добавить фото", "Фото"],
    ])("focuses the control when «%s» opens the field", async (prompt, label) => {
      const user = userEvent.setup();
      render(<AuthorProfileEditor profile={PROFILE} />);

      await user.click(screen.getByRole("button", { name: prompt }));

      expect(screen.getByLabelText(label)).toHaveFocus();
    });
  });
});
