import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PoemGenre } from "@/features/poems";

import { createPoemAction } from "../../actions/create-poem.actions";
import { NewPoemForm } from "../../components/NewPoemForm/NewPoemForm";
import { useCreatedPoemNotice } from "../../model/created-poem-notice-ui.store";
import type { CreatePoemResult } from "../../model/poem-management.types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../../actions/create-poem.actions", () => ({ createPoemAction: vi.fn() }));

type ActionResponse = Awaited<ReturnType<typeof createPoemAction>>;

const POEM_ID = "30000000-0000-4000-8000-000000000021";
const PREVIEW_URL = "blob:http://localhost:3000/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const GENRES: readonly PoemGenre[] = [
  { id: "lyric", name: "Лирика" },
  { id: "sonnet", name: "Сонет" },
];
const TITLE = "Первый снег";
const TEXT = "строка один\nстрока два";

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const GIF_HEADER = [...new TextEncoder().encode("GIF89a"), 0, 0, 0, 0, 0, 0];

function pngFile(): File {
  return new File([new Uint8Array(PNG_HEADER)], "snow.png", { type: "image/png" });
}

function respond(result: CreatePoemResult): ActionResponse {
  return { data: result } as ActionResponse;
}

/** A promise the test settles by hand, to observe the form while the action is pending. */
function deferred<T>(): { readonly promise: Promise<T>; readonly resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

const titleInput = () => screen.getByLabelText("Название произведения");
const textArea = () => screen.getByLabelText("Текст произведения");
const genreSelect = () => screen.getByRole("combobox", { name: "Выберите жанр" });
const illustrationInput = () => screen.getByLabelText("Иллюстрация (необязательно)");
const submitButton = () => screen.getByRole("button", { name: /^Добав/ });

function renderForm(): UserEvent {
  const user = userEvent.setup();
  render(<NewPoemForm genres={GENRES} />);
  return user;
}

async function fillValid(user: UserEvent, genreId = "lyric") {
  await user.click(titleInput());
  await user.paste(TITLE);
  fireEvent.change(textArea(), { target: { value: TEXT } });
  await user.selectOptions(genreSelect(), genreId);
}

/** The element a field's `aria-describedby` names first. */
function describedBy(element: HTMLElement): HTMLElement | null {
  const [id] = (element.getAttribute("aria-describedby") ?? "").split(" ");
  return id === "" ? null : document.getElementById(id);
}

beforeEach(() => {
  // jsdom has no object URLs.
  URL.createObjectURL = vi.fn(() => PREVIEW_URL);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.resetAllMocks();
  useCreatedPoemNotice.getState().clearCreatedPoemId();
});

describe("NewPoemForm", () => {
  // implements FR-3 of add-poem-creation
  it("shows the fields in order with their labels, and the genre options «—», the genres, «Без жанра»", () => {
    renderForm();

    const controls = [titleInput(), textArea(), genreSelect(), illustrationInput(), submitButton()];
    for (const [index, control] of controls.slice(1).entries()) {
      expect(controls[index].compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(within(genreSelect()).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "—",
      "Лирика",
      "Сонет",
      "Без жанра",
    ]);
    expect(genreSelect()).toHaveDisplayValue("—");
    expect(screen.getByText("Выбрать иллюстрацию")).toBeInTheDocument();
    expect(submitButton()).toHaveTextContent("Добавить произведение");
  });

  // implements FR-3 of add-poem-creation
  it("offers exactly the poem toolbar, in order", () => {
    renderForm();

    const toolbar = screen.getByRole("button", { name: "Жирный" }).parentElement as HTMLElement;
    expect(within(toolbar).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Жирный",
      "Курсив",
      "Эпиграф",
      "Разделитель частей",
      "Отступ",
    ]);
  });

  // implements FR-3 of add-poem-creation
  it("previews a valid PNG with «Убрать иллюстрацию», and removing it clears the file and the preview", async () => {
    const user = renderForm();

    await user.upload(illustrationInput(), pngFile());
    const preview = await screen.findByRole("presentation");
    expect(preview).toHaveAttribute("src", PREVIEW_URL);
    expect(preview).toHaveClass("aspect-video", "object-cover");
    expect(screen.getByText("snow.png")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Убрать иллюстрацию" }));

    expect(screen.queryByRole("presentation")).toBeNull();
    expect(screen.queryByText("snow.png")).toBeNull();
    expect(screen.queryByRole("button", { name: "Убрать иллюстрацию" })).toBeNull();
    expect((illustrationInput() as HTMLInputElement).files).toHaveLength(0);
  });

  // implements FR-4 of add-poem-creation
  it("rejects a GIF named .png on pick, sends nothing while its error shows, and clears the error on «Убрать иллюстрацию»", async () => {
    const user = renderForm();
    await fillValid(user);

    await user.upload(illustrationInput(), new File([new Uint8Array(GIF_HEADER)], "fake.png", { type: "image/png" }));
    const error = await screen.findByText("Допустимы только изображения PNG или JPEG.");
    expect(screen.queryByRole("presentation")).toBeNull();
    expect(describedBy(illustrationInput())).toBe(error);

    await user.click(submitButton());
    expect(createPoemAction).not.toHaveBeenCalled();
    expect(illustrationInput()).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Убрать иллюстрацию" }));
    expect(screen.queryByText("Допустимы только изображения PNG или JPEG.")).toBeNull();
  });

  // implements FR-4, NFR-7 of add-poem-creation
  it("shows «Обязательное поле.» under the title, text, and genre on an empty submit, sends nothing, and focuses the title", async () => {
    const user = renderForm();

    await user.click(submitButton());

    expect(createPoemAction).not.toHaveBeenCalled();
    for (const control of [titleInput(), textArea(), genreSelect()]) {
      expect(control).toHaveAttribute("aria-invalid", "true");
      expect(describedBy(control)).toHaveTextContent("Обязательное поле.");
    }
    expect(screen.getAllByText("Обязательное поле.")).toHaveLength(3);
    expect(titleInput()).toHaveFocus();
  });

  // implements FR-4 of add-poem-creation
  it("keeps all 81 characters of a long title and shows «Не более 80 символов.» under it", async () => {
    const user = renderForm();
    await fillValid(user);
    const longTitle = "а".repeat(81);
    await user.clear(titleInput());
    await user.paste(longTitle);

    await user.click(submitButton());

    expect(titleInput()).toHaveValue(longTitle);
    expect(describedBy(titleInput())).toHaveTextContent("Не более 80 символов.");
    expect(createPoemAction).not.toHaveBeenCalled();
  });

  // implements FR-4 of add-poem-creation
  it("counts the text the way the server does and flags it over 10000 in the danger colour", async () => {
    const user = renderForm();
    await fillValid(user);
    // Leading empty lines and trailing spaces don't count; `\r\n` counts once.
    fireEvent.change(textArea(), { target: { value: `\r\n${"а".repeat(9990)}${"\r\nб".repeat(5)}   ` } });
    expect(screen.getByText("10000 / 10000")).toHaveClass("text-muted");

    fireEvent.change(textArea(), { target: { value: "а".repeat(10001) } });
    expect(screen.getByText("10001 / 10000")).toHaveClass("text-danger");

    await user.click(submitButton());
    expect(screen.getByText("Не более 10000 символов.")).toBeInTheDocument();
    expect(textArea()).toHaveFocus();
    expect(createPoemAction).not.toHaveBeenCalled();
  });

  // implements NFR-7 of add-poem-creation
  it("switches an open «Просмотр» back to «Редактор» to focus an invalid text", async () => {
    const user = renderForm();
    await user.click(titleInput());
    await user.paste(TITLE);
    await user.selectOptions(genreSelect(), "lyric");
    await user.click(screen.getByRole("tab", { name: "Просмотр" }));

    await user.click(submitButton());

    expect(screen.getByRole("tab", { name: "Редактор" })).toHaveAttribute("aria-selected", "true");
    expect(textArea()).toBeVisible();
    expect(textArea()).toHaveFocus();
  });

  // implements FR-5 of add-poem-creation
  it("sends the drafts with the illustration, then stores the new id, clears the drafts, and opens the owner's poem page", async () => {
    vi.mocked(createPoemAction).mockResolvedValue(respond({ status: "created", poemId: POEM_ID }));
    const user = renderForm();
    await fillValid(user);
    const file = pngFile();
    await user.upload(illustrationInput(), file);
    await screen.findByRole("presentation");

    await user.click(submitButton());

    expect(createPoemAction).toHaveBeenCalledExactlyOnceWith({ title: TITLE, text: TEXT, genreId: "lyric", illustration: file });
    await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith(`/account/poems/${POEM_ID}`));
    expect(useCreatedPoemNotice.getState().createdPoemId).toBe(POEM_ID);
    expect(titleInput()).toHaveValue("");
    expect(textArea()).toHaveValue("");
    expect(genreSelect()).toHaveDisplayValue("—");
    expect(screen.queryByRole("presentation")).toBeNull();
  });

  // implements FR-5 of add-poem-creation
  it("sends «Без жанра» without an illustration", async () => {
    vi.mocked(createPoemAction).mockResolvedValue(respond({ status: "created", poemId: POEM_ID }));
    const user = renderForm();
    await fillValid(user, ":none");

    await user.click(submitButton());

    expect(createPoemAction).toHaveBeenCalledExactlyOnceWith({ title: TITLE, text: TEXT, genreId: ":none", illustration: undefined });
  });

  // implements FR-5 of add-poem-creation
  it("sends once on a double click and reads «Добавление…» with the whole form disabled while sending", async () => {
    const answer = deferred<ActionResponse>();
    vi.mocked(createPoemAction).mockReturnValue(answer.promise);
    const user = renderForm();
    await fillValid(user);

    await user.dblClick(submitButton());

    expect(createPoemAction).toHaveBeenCalledTimes(1);
    expect(submitButton()).toHaveTextContent("Добавление…");
    expect(submitButton()).toBeDisabled();
    expect(titleInput()).toBeDisabled();
    expect(genreSelect()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Жирный" })).toBeDisabled();
    expect(submitButton().closest("fieldset")).toHaveClass("disabled:opacity-50");

    await act(async () => answer.resolve(respond({ status: "failed", failure: "unavailable" })));
    expect(submitButton()).toHaveTextContent("Добавить произведение");
    expect(submitButton()).toBeEnabled();
  });

  // implements FR-5, FR-6, NFR-7 of add-poem-creation
  it.each([
    ["unavailable", "Сохранение сейчас недоступно. Попробуйте позже."],
    ["unauthenticated", "Сессия истекла. Войдите снова."],
    ["too-many-poems", "Слишком много новых произведений. Попробуйте позже."],
  ] as const)("shows the %s failure above the submit button, keeps the drafts, and focuses the alert", async (failure, message) => {
    vi.mocked(createPoemAction).mockResolvedValue(respond({ status: "failed", failure }));
    const user = renderForm();
    await fillValid(user);

    await user.click(submitButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(message);
    expect(alert.compareDocumentPosition(submitButton()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Focus moves once the transition ends and the fieldset is enabled again.
    await waitFor(() => expect(alert.parentElement).toHaveFocus());
    expect(titleInput()).toHaveValue(TITLE);
    expect(textArea()).toHaveValue(TEXT);
    expect(genreSelect()).toHaveDisplayValue("Лирика");
    expect(push).not.toHaveBeenCalled();
  });

  // implements FR-5 of add-poem-creation
  it("shows the generic failure when the action returns no data, or the call itself fails", async () => {
    vi.mocked(createPoemAction).mockResolvedValueOnce({ serverError: "x" } as ActionResponse);
    const user = renderForm();
    await fillValid(user);

    await user.click(submitButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("Что-то пошло не так. Попробуйте ещё раз.");
    await waitFor(() => expect(submitButton()).toBeEnabled());

    vi.mocked(createPoemAction).mockRejectedValueOnce(new Error("network"));
    await user.click(submitButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("Что-то пошло не так. Попробуйте ещё раз.");
    expect(createPoemAction).toHaveBeenCalledTimes(2);
  });

  // implements FR-4, NFR-7 of add-poem-creation
  it("drops a genre the server reports as removed, resets the dropdown to «—», keeps the other drafts, and focuses it", async () => {
    vi.mocked(createPoemAction).mockResolvedValue(
      respond({ status: "invalid", fieldErrors: { genreId: "Этот жанр больше недоступен. Выберите другой." } }),
    );
    const user = renderForm();
    await fillValid(user, "sonnet");

    await user.click(submitButton());

    await waitFor(() => expect(genreSelect()).toHaveFocus());
    expect(describedBy(genreSelect())).toHaveTextContent("Этот жанр больше недоступен. Выберите другой.");
    expect(within(genreSelect()).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "—",
      "Лирика",
      "Без жанра",
    ]);
    expect(genreSelect()).toHaveDisplayValue("—");
    expect(titleInput()).toHaveValue(TITLE);
    expect(textArea()).toHaveValue(TEXT);
  });

  // implements FR-5 of add-poem-creation
  it("keeps errors while editing and hides them when the next submit starts", async () => {
    const answer = deferred<ActionResponse>();
    vi.mocked(createPoemAction).mockResolvedValueOnce(respond({ status: "failed", failure: "unavailable" }));
    const user = renderForm();
    await fillValid(user);
    await user.click(submitButton());
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await waitFor(() => expect(titleInput()).toBeEnabled());

    await user.type(titleInput(), "!");
    expect(screen.getByRole("alert")).toBeInTheDocument();

    vi.mocked(createPoemAction).mockReturnValueOnce(answer.promise);
    await user.click(submitButton());
    expect(screen.queryByRole("alert")).toBeNull();

    await act(async () => answer.resolve(respond({ status: "created", poemId: POEM_ID })));
  });
});
