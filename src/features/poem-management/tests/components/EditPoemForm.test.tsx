import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PoemGenre } from "@/features/poems";
import { useConnectionStatus, type ConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";

import { updatePoemAction } from "../../actions/update-poem.actions";
import { EditPoemForm } from "../../components/EditPoemForm/EditPoemForm";
import { useCreatedPoemNotice } from "../../model/created-poem-notice-ui.store";
import { useDeletedPoemNotice } from "../../model/deleted-poem-notice-ui.store";
import type { PoemFormValues } from "../../model/poem-form-values";
import type { UpdatePoemResult } from "../../model/poem-management.types";

const push = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace, refresh }) }));
vi.mock("../../actions/update-poem.actions", () => ({ updatePoemAction: vi.fn() }));
vi.mock("@/shared/lib/network/use-connection-status", () => ({ useConnectionStatus: vi.fn() }));

type ActionResponse = Awaited<ReturnType<typeof updatePoemAction>>;

const POEM_ID = "30000000-0000-4000-8000-000000000021";
const STORED_URL = "http://127.0.0.1:54321/storage/v1/object/public/poem-illustrations/a/b.png";
const PREVIEW_URL = "blob:http://localhost:3000/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
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
const WITHOUT_ILLUSTRATION: PoemFormValues = { ...STORED, illustration: { kind: "none" } };

const OFFLINE_TEXT = "Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.";
const SLOW_TEXT = "Медленное подключение к интернету. Сохранение станет доступно, когда связь улучшится.";
const UNKNOWN_TEXT = "Что-то пошло не так. Попробуйте ещё раз.";

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const GIF_HEADER = [...new TextEncoder().encode("GIF89a"), 0, 0, 0, 0, 0, 0];

function pngFile(): File {
  return new File([new Uint8Array(PNG_HEADER)], "snow.png", { type: "image/png" });
}

function respond(result: UpdatePoemResult): ActionResponse {
  return { data: result } as ActionResponse;
}

/** A promise the test settles by hand, to observe the form while the action is pending. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

const titleInput = () => screen.getByLabelText("Название произведения");
const textArea = () => screen.getByLabelText("Текст произведения");
const genreSelect = () => screen.getByRole("combobox", { name: "Выберите жанр" });
const illustrationInput = () => screen.getByLabelText("Иллюстрация (необязательно)");
const saveButton = () => screen.getByRole("button", { name: /^Сохран/ });
const discardButton = () => screen.getByRole("button", { name: "Отменить изменения" });
const backLink = () => screen.getByRole("link", { name: "Вернуться на страницу произведения" });
const removeButton = () => screen.getByRole("button", { name: "Удалить иллюстрацию" });

function setConnection(status: ConnectionStatus) {
  vi.mocked(useConnectionStatus).mockReturnValue(status);
}

function renderForm(stored: PoemFormValues = STORED) {
  const user = userEvent.setup();
  const view = render(<EditPoemForm poemId={POEM_ID} stored={stored} genres={GENRES} />);
  const rerender = () => view.rerender(<EditPoemForm poemId={POEM_ID} stored={stored} genres={GENRES} />);
  return { user, rerender };
}

async function changeTitle(user: UserEvent, suffix = ".") {
  await user.click(titleInput());
  await user.keyboard(`{End}${suffix}`);
}

beforeEach(() => {
  setConnection("online");
  // jsdom has no object URLs.
  URL.createObjectURL = vi.fn(() => PREVIEW_URL);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.resetAllMocks();
  vi.useRealTimers();
  useCreatedPoemNotice.getState().clearPoemNotice();
  useDeletedPoemNotice.getState().clearDeletedNotice();
  useSessionExpiredNotice.getState().clearSessionExpired();
});

describe("EditPoemForm: stored values and change detection", () => {
  // implements FR-2, FR-3, FR-4 of edit-poem
  it("opens with the stored values, the stored preview, and only the back link", () => {
    renderForm();

    expect(titleInput()).toHaveValue(STORED.title);
    expect(textArea()).toHaveValue(STORED.text);
    expect(genreSelect()).toHaveDisplayValue("Лирика");
    expect(screen.getByRole("presentation")).toHaveAttribute("src", STORED_URL);
    expect(screen.getByText("Заменить иллюстрацию")).toBeInTheDocument();
    expect(removeButton()).toBeInTheDocument();
    expect(backLink()).toHaveAttribute("href", `/account/poems/${POEM_ID}`);
    expect(screen.queryByRole("button", { name: /^Сохран/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Отменить изменения" })).toBeNull();
  });

  // implements FR-3 of edit-poem
  it("swaps the back link for save and discard on a real change, and back when it is undone", async () => {
    const { user } = renderForm();

    await changeTitle(user);
    expect(saveButton()).toHaveTextContent("Сохранить изменения");
    expect(discardButton()).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Вернуться на страницу произведения" })).toBeNull();

    await user.keyboard("{Backspace}");
    expect(backLink()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Сохран/ })).toBeNull();
  });

  // implements FR-3 of edit-poem
  it("stays unchanged when the edit only adds what saving trims", async () => {
    const { user } = renderForm();

    await changeTitle(user, "  ");
    fireEvent.change(textArea(), { target: { value: `${STORED.text}\n\n` } });

    expect(backLink()).toBeInTheDocument();
  });

  // implements FR-3, FR-4 of edit-poem
  it("counts a removed stored illustration and a newly picked one as changes", async () => {
    const { user } = renderForm();
    await user.click(removeButton());

    expect(screen.queryByRole("presentation")).toBeNull();
    expect(screen.getByText("Выбрать иллюстрацию")).toBeInTheDocument();
    expect(saveButton()).toBeInTheDocument();
  });

  // implements FR-3, FR-4 of edit-poem
  it("counts a valid pick on a poem without an illustration as a change, and its removal ends with none", async () => {
    const { user } = renderForm(WITHOUT_ILLUSTRATION);

    await user.upload(illustrationInput(), pngFile());
    expect(await screen.findByRole("presentation")).toHaveAttribute("src", PREVIEW_URL);
    expect(saveButton()).toBeInTheDocument();

    await user.click(removeButton());
    expect(screen.queryByRole("presentation")).toBeNull();
    expect(backLink()).toBeInTheDocument();
  });

  // implements FR-4 of edit-poem: CR-01, «Удалить иллюстрацию» after a rejected pick removes the stored one too
  it("removes the stored illustration with the error after a rejected pick, and discard brings it back", async () => {
    const { user } = renderForm();

    await user.upload(illustrationInput(), new File([new Uint8Array(GIF_HEADER)], "fake.png", { type: "image/png" }));
    await screen.findByText("Допустимы только изображения PNG или JPEG.");
    expect(screen.getByRole("presentation")).toHaveAttribute("src", STORED_URL);
    // A rejected pick is no change.
    expect(backLink()).toBeInTheDocument();

    await user.click(removeButton());
    expect(screen.queryByText("Допустимы только изображения PNG или JPEG.")).toBeNull();
    expect(screen.queryByRole("presentation")).toBeNull();
    expect(saveButton()).toBeInTheDocument();

    await user.click(discardButton());
    expect(screen.getByRole("presentation")).toHaveAttribute("src", STORED_URL);
  });
});

describe("EditPoemForm: discard", () => {
  // implements FR-3 of edit-poem
  it("puts every field and the stored preview back, clears errors, sends nothing, and focuses the back link", async () => {
    const { user } = renderForm();
    await user.clear(titleInput());
    await user.paste("Черновик");
    fireEvent.change(textArea(), { target: { value: "" } });
    await user.selectOptions(genreSelect(), "sonnet");
    await user.click(removeButton());
    await user.click(saveButton());
    expect(await screen.findByText("Обязательное поле.")).toBeInTheDocument();

    await user.click(discardButton());

    expect(titleInput()).toHaveValue(STORED.title);
    expect(textArea()).toHaveValue(STORED.text);
    expect(genreSelect()).toHaveDisplayValue("Лирика");
    expect(screen.getByRole("presentation")).toHaveAttribute("src", STORED_URL);
    expect(screen.getByText("Заменить иллюстрацию")).toBeInTheDocument();
    expect(removeButton()).toBeInTheDocument();
    expect(screen.queryByText("Обязательное поле.")).toBeNull();
    expect(updatePoemAction).not.toHaveBeenCalled();
    expect(backLink()).toHaveFocus();
  });
});

describe("EditPoemForm: saving", () => {
  // implements FR-6 of edit-poem
  it("sends the poem's id and fields, then stores the saved notice and opens the owner's poem page", async () => {
    vi.mocked(updatePoemAction).mockResolvedValue(respond({ status: "saved" }));
    const { user } = renderForm();
    await changeTitle(user);
    await user.selectOptions(genreSelect(), "Без жанра");

    await user.click(saveButton());

    expect(updatePoemAction).toHaveBeenCalledExactlyOnceWith({
      poemId: POEM_ID,
      title: "Первый снег.",
      text: STORED.text,
      genreId: ":none",
      illustrationChange: "keep",
      illustration: undefined,
    });
    await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith(`/account/poems/${POEM_ID}`));
    expect(useCreatedPoemNotice.getState().notice).toEqual({ poemId: POEM_ID, kind: "saved" });
    expect(replace).not.toHaveBeenCalled();
  });

  // implements FR-6 of edit-poem: a double click saves once, also across the gap before the navigation ends
  it("sends nothing more after a saved result, while the owner's poem page opens", async () => {
    vi.mocked(updatePoemAction).mockResolvedValue(respond({ status: "saved" }));
    const { user } = renderForm();
    await changeTitle(user);

    await user.click(saveButton());
    await waitFor(() => expect(push).toHaveBeenCalledOnce());
    expect(saveButton()).toBeDisabled();
    fireEvent.submit(titleInput().closest("form") as HTMLFormElement);

    expect(updatePoemAction).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledOnce();
  });

  // implements FR-4 of edit-poem
  it("asks to remove a removed illustration and to replace with a newly picked file", async () => {
    // A failure keeps the form on the page for the second save.
    vi.mocked(updatePoemAction).mockResolvedValue(respond({ status: "failed", failure: "unavailable" }));
    const { user } = renderForm();
    await user.click(removeButton());
    await user.click(saveButton());
    expect(updatePoemAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ illustrationChange: "remove", illustration: undefined }),
    );
    await waitFor(() => expect(saveButton()).toBeEnabled());

    const file = pngFile();
    await user.upload(illustrationInput(), file);
    await screen.findByRole("presentation");
    await user.click(saveButton());
    expect(updatePoemAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ illustrationChange: "replace", illustration: file }),
    );
  });

  // implements FR-6 of edit-poem
  it("sends once on a double click and reads «Сохранение…» with the whole form disabled while sending", async () => {
    const answer = deferred<ActionResponse>();
    vi.mocked(updatePoemAction).mockReturnValue(answer.promise);
    const { user } = renderForm();
    await changeTitle(user);

    await user.dblClick(saveButton());

    expect(updatePoemAction).toHaveBeenCalledTimes(1);
    expect(saveButton()).toHaveTextContent("Сохранение…");
    expect(saveButton()).toBeDisabled();
    expect(discardButton()).toBeDisabled();
    expect(titleInput()).toBeDisabled();
    expect(saveButton().closest("fieldset")).toHaveClass("disabled:opacity-50");

    await act(async () => answer.resolve(respond({ status: "failed", failure: "unavailable" })));
    expect(saveButton()).toHaveTextContent("Сохранить изменения");
    expect(saveButton()).toBeEnabled();
  });

  // implements FR-5 of edit-poem
  it("shows «Обязательное поле.» under a cleared title, focuses it, and sends nothing", async () => {
    const { user } = renderForm();
    await user.clear(titleInput());

    await user.click(saveButton());

    const error = await screen.findByText("Обязательное поле.");
    const [describedById] = (titleInput().getAttribute("aria-describedby") ?? "").split(" ");
    expect(describedById).toBe(error.id);
    expect(titleInput()).toHaveFocus();
    expect(updatePoemAction).not.toHaveBeenCalled();
  });

  // implements FR-5 of edit-poem
  it("shows the server's field errors and focuses the first invalid field", async () => {
    vi.mocked(updatePoemAction).mockResolvedValue(
      respond({ status: "invalid", fieldErrors: { title: "Не более 80 символов." } }),
    );
    const { user } = renderForm();
    await changeTitle(user);

    await user.click(saveButton());

    expect(await screen.findByText("Не более 80 символов.")).toBeInTheDocument();
    await waitFor(() => expect(titleInput()).toHaveFocus());
    expect(push).not.toHaveBeenCalled();
  });

  // implements FR-10 of edit-poem
  it("on a poem gone meanwhile, stores the already-deleted notice and replaces the page with the list", async () => {
    vi.mocked(updatePoemAction).mockResolvedValue(respond({ status: "not-found" }));
    const { user } = renderForm();
    await changeTitle(user);

    await user.click(saveButton());

    await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith("/account/poems"));
    expect(useDeletedPoemNotice.getState().notice).toEqual({ kind: "already-deleted" });
    expect(push).not.toHaveBeenCalled();
  });

  // implements FR-9 of edit-poem
  it("on an expired session, flags it, replaces the page with /login, and refreshes the header", async () => {
    vi.mocked(updatePoemAction).mockResolvedValue(respond({ status: "failed", failure: "unauthenticated" }));
    const { user } = renderForm();
    await changeTitle(user);

    await user.click(saveButton());

    await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith("/login"));
    expect(refresh).toHaveBeenCalledOnce();
    expect(useSessionExpiredNotice.getState().expired).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // implements FR-7, FR-8, FR-10, NFR-4, NFR-7 of edit-poem
  it.each([
    ["unavailable", "Сохранение сейчас недоступно. Попробуйте позже."],
    ["too-many-saves", "Слишком много сохранений. Попробуйте через минуту."],
    ["not-public", "Чтобы сохранять изменения, укажите имя и фамилию в профиле автора."],
    ["unknown", UNKNOWN_TEXT],
    // implements FR-14 of admin-moderation
    ["restricted", "Ваш аккаунт заблокирован: изменения недоступны."],
  ] as const)("shows the %s failure above the form, focuses it, and keeps every value", async (failure, message) => {
    vi.mocked(updatePoemAction).mockResolvedValue(respond({ status: "failed", failure }));
    const { user } = renderForm();
    await changeTitle(user);

    await user.click(saveButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(message);
    expect(alert.compareDocumentPosition(titleInput()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await waitFor(() => expect(alert.parentElement).toHaveFocus());
    expect(titleInput()).toHaveValue("Первый снег.");
    expect(textArea()).toHaveValue(STORED.text);
    expect(saveButton()).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  // implements FR-8 of edit-poem
  it("shows the generic failure for a response with no data, and never retries on its own", async () => {
    vi.mocked(updatePoemAction).mockResolvedValue({ serverError: "x" } as ActionResponse);
    const { user } = renderForm();
    await changeTitle(user);

    await user.click(saveButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(UNKNOWN_TEXT);

    vi.useFakeTimers();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(updatePoemAction).toHaveBeenCalledTimes(1);
  });

  // implements FR-8 of edit-poem
  it("hides the alert when the next save starts", async () => {
    const second = deferred<ActionResponse>();
    vi.mocked(updatePoemAction)
      .mockResolvedValueOnce(respond({ status: "failed", failure: "unavailable" }))
      .mockReturnValueOnce(second.promise);
    const { user } = renderForm();
    await changeTitle(user);
    await user.click(saveButton());
    await screen.findByRole("alert");
    await waitFor(() => expect(saveButton()).toBeEnabled());

    await user.click(saveButton());

    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => second.resolve(respond({ status: "saved" })));
  });
});

describe("EditPoemForm: connection", () => {
  // implements FR-11 of edit-poem
  it.each([
    ["offline", OFFLINE_TEXT],
    ["slow", SLOW_TEXT],
  ] as const)("while %s, shows the notice and disables only the save button, until the connection is normal", async (status, text) => {
    setConnection(status);
    const { user, rerender } = renderForm();
    await changeTitle(user);

    expect(screen.getByRole("status")).toHaveTextContent(text);
    expect(saveButton()).toBeDisabled();
    expect(discardButton()).toBeEnabled();
    await user.keyboard("!");
    expect(titleInput()).toHaveValue("Первый снег.!");
    await user.click(saveButton());
    expect(updatePoemAction).not.toHaveBeenCalled();

    setConnection("online");
    rerender();
    expect(screen.queryByRole("status")).toBeNull();
    expect(saveButton()).toBeEnabled();
  });

  // implements FR-11 of edit-poem
  it("shows no alert for a call rejected after the connection dropped, and the unknown alert while online", async () => {
    const lost = deferred<ActionResponse>();
    vi.mocked(updatePoemAction).mockReturnValueOnce(lost.promise).mockRejectedValueOnce(new Error("network"));
    const { user, rerender } = renderForm();
    await changeTitle(user);
    await user.click(saveButton());

    setConnection("offline");
    rerender();
    await act(async () => lost.reject(new Error("network")));

    expect(screen.getByRole("status")).toHaveTextContent(OFFLINE_TEXT);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(titleInput()).toHaveValue("Первый снег.");

    setConnection("online");
    rerender();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    await waitFor(() => expect(saveButton()).toBeEnabled());

    await user.click(saveButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(UNKNOWN_TEXT);
  });

  // implements NFR-10 of edit-poem: CR-05, a rejected call is logged by its error type, never the poem
  it("logs a rejected call by its error type only", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(updatePoemAction).mockRejectedValue(new TypeError("Failed to fetch Первый снег."));
    const { user } = renderForm();
    await changeTitle(user);

    await user.click(saveButton());

    await screen.findByRole("alert");
    expect(log).toHaveBeenCalledExactlyOnceWith("[poem-management] save call rejected: TypeError");
  });
});
