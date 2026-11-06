import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type ConnectionStatus, useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";

import { updateCollectionAction } from "../../actions/update-collection.actions";
import { EditCollectionForm } from "../../components/EditCollectionForm/EditCollectionForm";
import type { CollectionFormValues } from "../../model/collection-form-values";
import { useCollectionListNotice } from "../../model/collection-list-notice-ui.store";
import type { UpdateCollectionResult } from "../../model/collection-management.types";
import { useSavedCollectionNotice } from "../../model/saved-collection-notice-ui.store";

const push = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace, refresh }) }));
vi.mock("../../actions/update-collection.actions", () => ({ updateCollectionAction: vi.fn() }));
vi.mock("@/shared/lib/network/use-connection-status", () => ({ useConnectionStatus: vi.fn() }));

type ActionResponse = Awaited<ReturnType<typeof updateCollectionAction>>;

const COLLECTION_ID = "40000000-0000-4000-8000-000000000031";
const STORED: CollectionFormValues = { title: "Осенний цикл", description: "Стихи октября" };
const CHANGED_TITLE = "Осенний цикл.";

const OFFLINE_TEXT = "Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.";
const SLOW_TEXT = "Медленное подключение к интернету. Сохранение станет доступно, когда связь улучшится.";
const UNKNOWN_TEXT = "Что-то пошло не так. Попробуйте ещё раз.";
const UNAVAILABLE_TEXT = "Сохранение сейчас недоступно. Попробуйте позже.";
const ONE_MINUTE_MS = 60_000;

function respond(result: UpdateCollectionResult): ActionResponse {
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

const titleInput = () => screen.getByRole("textbox", { name: "Название сборника" });
const descriptionArea = () => screen.getByRole("textbox", { name: "Описание (необязательно)" });
const saveButton = () => screen.getByRole("button", { name: /^Сохран/ });
const discardButton = () => screen.getByRole("button", { name: "Отменить изменения" });
const backLink = () => screen.getByRole("link", { name: "Вернуться к сборнику" });

function setConnection(status: ConnectionStatus) {
  vi.mocked(useConnectionStatus).mockReturnValue(status);
}

function renderForm(stored: CollectionFormValues = STORED) {
  const user = userEvent.setup();
  const view = render(<EditCollectionForm collectionId={COLLECTION_ID} stored={stored} />);
  const rerender = () => view.rerender(<EditCollectionForm collectionId={COLLECTION_ID} stored={stored} />);
  return { user, rerender };
}

async function changeTitle(user: UserEvent, suffix = ".") {
  await user.click(titleInput());
  await user.keyboard(`{End}${suffix}`);
}

beforeEach(() => {
  setConnection("online");
});

afterEach(() => {
  vi.resetAllMocks();
  vi.useRealTimers();
  useSavedCollectionNotice.getState().clearSavedNotice();
  useCollectionListNotice.getState().clearListNotice();
  useSessionExpiredNotice.getState().clearSessionExpired();
});

describe("EditCollectionForm: stored values and change detection", () => {
  // implements FR-7, FR-8 of add-poem-collections
  it("opens with the stored values and only the back link to the collection page", () => {
    renderForm();

    expect(titleInput()).toHaveValue(STORED.title);
    expect(descriptionArea()).toHaveValue(STORED.description);
    expect(backLink()).toHaveAttribute("href", `/account/poems/collections/${COLLECTION_ID}`);
    expect(screen.queryByRole("button", { name: /^Сохран/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Отменить изменения" })).toBeNull();
  });

  // implements FR-7 of add-poem-collections
  it("opens with an empty text area for a collection without a description", () => {
    renderForm({ title: STORED.title, description: "" });

    expect(descriptionArea()).toHaveValue("");
    expect(backLink()).toBeInTheDocument();
  });

  // implements FR-8 of add-poem-collections
  it("swaps the back link for save and discard on a real change, and back when it is undone", async () => {
    const { user } = renderForm();

    await changeTitle(user);
    expect(saveButton()).toHaveTextContent("Сохранить изменения");
    expect(discardButton()).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Вернуться к сборнику" })).toBeNull();

    await user.keyboard("{Backspace}");
    expect(backLink()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Сохран/ })).toBeNull();
  });

  // implements FR-8 of add-poem-collections
  it("stays unchanged when the edit only adds what saving trims", async () => {
    const { user } = renderForm();

    await changeTitle(user, " ");
    fireEvent.change(descriptionArea(), { target: { value: `${STORED.description}\n\n` } });

    expect(backLink()).toBeInTheDocument();
  });

  // implements FR-8 of add-poem-collections
  it("counts a changed description as a change", async () => {
    const { user } = renderForm();

    await user.click(descriptionArea());
    await user.keyboard("{End}!");

    expect(saveButton()).toBeInTheDocument();
  });
});

describe("EditCollectionForm: discard", () => {
  // implements FR-8 of add-poem-collections
  it("puts both fields back, clears errors, sends nothing, and focuses the back link", async () => {
    const { user } = renderForm();
    await user.clear(titleInput());
    fireEvent.change(descriptionArea(), { target: { value: "Черновик" } });
    await user.click(saveButton());
    expect(await screen.findByText("Обязательное поле.")).toBeInTheDocument();

    await user.click(discardButton());

    expect(titleInput()).toHaveValue(STORED.title);
    expect(descriptionArea()).toHaveValue(STORED.description);
    expect(screen.queryByText("Обязательное поле.")).toBeNull();
    expect(updateCollectionAction).not.toHaveBeenCalled();
    expect(backLink()).toHaveFocus();
  });

  // implements FR-8 of add-poem-collections
  it("clears the failure alert", async () => {
    vi.mocked(updateCollectionAction).mockResolvedValue(respond({ status: "failed", failure: "unavailable" }));
    const { user } = renderForm();
    await changeTitle(user);
    await user.click(saveButton());
    await screen.findByRole("alert");
    await waitFor(() => expect(discardButton()).toBeEnabled());

    await user.click(discardButton());

    expect(screen.queryByRole("alert")).toBeNull();
    expect(backLink()).toHaveFocus();
  });
});

describe("EditCollectionForm: saving", () => {
  // implements FR-9 of add-poem-collections
  it("sends the collection's id and both fields, then stores the saved notice and opens the collection page", async () => {
    vi.mocked(updateCollectionAction).mockResolvedValue(respond({ status: "saved" }));
    const { user } = renderForm();
    await changeTitle(user);

    await user.click(saveButton());

    expect(updateCollectionAction).toHaveBeenCalledExactlyOnceWith({
      collectionId: COLLECTION_ID,
      title: CHANGED_TITLE,
      description: STORED.description,
    });
    await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith(`/account/poems/collections/${COLLECTION_ID}`));
    expect(useSavedCollectionNotice.getState().notice).toEqual({ collectionId: COLLECTION_ID });
    expect(replace).not.toHaveBeenCalled();
  });

  // implements FR-9 of add-poem-collections: a double click saves once, also across the gap before the navigation ends
  it("sends nothing more after a saved result, while the collection page opens", async () => {
    vi.mocked(updateCollectionAction).mockResolvedValue(respond({ status: "saved" }));
    const { user } = renderForm();
    await changeTitle(user);

    await user.click(saveButton());
    await waitFor(() => expect(push).toHaveBeenCalledOnce());
    expect(saveButton()).toBeDisabled();
    fireEvent.submit(titleInput().closest("form") as HTMLFormElement);

    expect(updateCollectionAction).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledOnce();
  });

  // implements FR-8, FR-9 of add-poem-collections
  it("sends once on a double click and reads «Сохранение…» with the whole form and discard disabled while sending", async () => {
    const answer = deferred<ActionResponse>();
    vi.mocked(updateCollectionAction).mockReturnValue(answer.promise);
    const { user } = renderForm();
    await changeTitle(user);

    await user.dblClick(saveButton());

    expect(updateCollectionAction).toHaveBeenCalledTimes(1);
    expect(saveButton()).toHaveTextContent("Сохранение…");
    expect(saveButton()).toBeDisabled();
    expect(discardButton()).toBeDisabled();
    expect(titleInput()).toBeDisabled();
    expect(descriptionArea()).toBeDisabled();
    expect(saveButton().closest("fieldset")).toHaveClass("disabled:opacity-50");

    await act(async () => answer.resolve(respond({ status: "failed", failure: "unavailable" })));
    expect(saveButton()).toHaveTextContent("Сохранить изменения");
    expect(saveButton()).toBeEnabled();
  });

  // implements FR-7, NFR-4 of add-poem-collections
  it("shows «Обязательное поле.» under a cleared title, focuses it, and sends nothing", async () => {
    const { user } = renderForm();
    await user.clear(titleInput());

    await user.click(saveButton());

    expect(titleInput()).toHaveAccessibleDescription("Обязательное поле.");
    expect(titleInput()).toHaveFocus();
    expect(updateCollectionAction).not.toHaveBeenCalled();
  });

  // implements FR-7, NFR-4 of add-poem-collections
  it("shows the server's field errors and focuses the first invalid field", async () => {
    vi.mocked(updateCollectionAction).mockResolvedValue(
      respond({ status: "invalid", fieldErrors: { description: "Не более 1000 символов." } }),
    );
    const { user } = renderForm();
    await changeTitle(user);

    await user.click(saveButton());

    await waitFor(() => expect(descriptionArea()).toHaveFocus());
    expect(descriptionArea()).toHaveAccessibleDescription("Не более 1000 символов.");
    expect(push).not.toHaveBeenCalled();
  });

  // implements FR-11 of add-poem-collections
  it("on a collection gone meanwhile, stores the already-deleted notice and replaces the page with the list", async () => {
    vi.mocked(updateCollectionAction).mockResolvedValue(respond({ status: "not-found" }));
    const { user } = renderForm();
    await changeTitle(user);

    await user.click(saveButton());

    await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith("/account/poems"));
    expect(useCollectionListNotice.getState().notice).toEqual({ kind: "already-deleted" });
    expect(push).not.toHaveBeenCalled();
  });

  // implements FR-11 of add-poem-collections
  it("on an expired session, flags it, replaces the page with /login, and refreshes the header", async () => {
    vi.mocked(updateCollectionAction).mockResolvedValue(respond({ status: "failed", failure: "unauthenticated" }));
    const { user } = renderForm();
    await changeTitle(user);

    await user.click(saveButton());

    await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith("/login"));
    expect(refresh).toHaveBeenCalledOnce();
    expect(useSessionExpiredNotice.getState().expired).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // implements FR-10, FR-11, NFR-4 of add-poem-collections
  it.each([
    ["unavailable", UNAVAILABLE_TEXT],
    ["too-many-saves", "Слишком много сохранений. Попробуйте через минуту."],
    ["not-public", "Чтобы сохранять изменения, укажите имя и фамилию в профиле автора."],
    ["unknown", UNKNOWN_TEXT],
  ] as const)("shows the %s failure above the form, focuses it, and keeps every value", async (failure, message) => {
    vi.mocked(updateCollectionAction).mockResolvedValue(respond({ status: "failed", failure }));
    const { user } = renderForm();
    await changeTitle(user);

    await user.click(saveButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(message);
    expect(alert.compareDocumentPosition(titleInput().closest("form") as HTMLFormElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await waitFor(() => expect(alert.parentElement).toHaveFocus());
    expect(titleInput()).toHaveValue(CHANGED_TITLE);
    expect(descriptionArea()).toHaveValue(STORED.description);
    expect(saveButton()).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  // implements FR-11 of add-poem-collections
  it("focuses the alert again when the same failure repeats", async () => {
    vi.mocked(updateCollectionAction).mockResolvedValue(respond({ status: "failed", failure: "unavailable" }));
    const { user } = renderForm();
    await changeTitle(user);
    await user.click(saveButton());
    await waitFor(() => expect(screen.getByRole("alert").parentElement).toHaveFocus());

    await user.click(titleInput());
    await user.click(saveButton());

    await waitFor(() => expect(screen.getByRole("alert").parentElement).toHaveFocus());
    expect(updateCollectionAction).toHaveBeenCalledTimes(2);
  });

  // implements FR-11 of add-poem-collections
  it("shows the generic failure for a response with no data, and never retries on its own", async () => {
    vi.mocked(updateCollectionAction).mockResolvedValue({ serverError: "x" } as ActionResponse);
    const { user } = renderForm();
    await changeTitle(user);

    await user.click(saveButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(UNKNOWN_TEXT);

    vi.useFakeTimers();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ONE_MINUTE_MS);
    });
    expect(updateCollectionAction).toHaveBeenCalledTimes(1);
  });

  // implements FR-11 of add-poem-collections
  it("hides the alert when the next save starts", async () => {
    const second = deferred<ActionResponse>();
    vi.mocked(updateCollectionAction)
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

describe("EditCollectionForm: connection", () => {
  // implements FR-14 of add-poem-collections
  it.each([
    ["offline", OFFLINE_TEXT],
    ["slow", SLOW_TEXT],
  ] as const)("while %s, shows the notice above the form and disables only the save button, until the connection is normal", async (status, text) => {
    setConnection(status);
    const { user, rerender } = renderForm();
    await changeTitle(user);

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(text);
    expect(notice.compareDocumentPosition(titleInput()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(saveButton()).toBeDisabled();
    expect(discardButton()).toBeEnabled();
    await user.keyboard("!");
    expect(titleInput()).toHaveValue(`${CHANGED_TITLE}!`);
    fireEvent.submit(titleInput().closest("form") as HTMLFormElement);
    expect(updateCollectionAction).not.toHaveBeenCalled();

    setConnection("online");
    rerender();
    expect(screen.queryByRole("status")).toBeNull();
    expect(saveButton()).toBeEnabled();
  });

  // implements FR-14 of add-poem-collections
  it("shows no alert for a call rejected after the connection dropped, and the unknown alert while online", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const lost = deferred<ActionResponse>();
    vi.mocked(updateCollectionAction).mockReturnValueOnce(lost.promise).mockRejectedValueOnce(new Error("network"));
    const { user, rerender } = renderForm();
    await changeTitle(user);
    await user.click(saveButton());

    setConnection("offline");
    rerender();
    await act(async () => lost.reject(new Error("network")));

    expect(screen.getByRole("status")).toHaveTextContent(OFFLINE_TEXT);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(titleInput()).toHaveValue(CHANGED_TITLE);

    setConnection("online");
    rerender();
    expect(screen.queryByRole("status")).toBeNull();
    await waitFor(() => expect(saveButton()).toBeEnabled());

    await user.click(saveButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(UNKNOWN_TEXT);
  });

  // implements NFR-5 of add-poem-collections
  it("logs a rejected call by its error type only", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(updateCollectionAction).mockRejectedValue(new TypeError(`Failed to fetch ${STORED.title}`));
    const { user } = renderForm();
    await changeTitle(user);

    await user.click(saveButton());

    await screen.findByRole("alert");
    expect(log).toHaveBeenCalledExactlyOnceWith("[collection-management] save call rejected: TypeError");
  });
});
