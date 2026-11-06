import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type ConnectionStatus, useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";

import { createCollectionAction } from "../../actions/create-collection.actions";
import { NewCollectionForm } from "../../components/NewCollectionForm/NewCollectionForm";
import { useCollectionListNotice } from "../../model/collection-list-notice-ui.store";
import type { CreateCollectionResult } from "../../model/collection-management.types";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("../../actions/create-collection.actions", () => ({ createCollectionAction: vi.fn() }));
vi.mock("@/shared/lib/network/use-connection-status", () => ({ useConnectionStatus: vi.fn() }));

type ActionResponse = Awaited<ReturnType<typeof createCollectionAction>>;

const TITLE = "Осенний цикл";
const DESCRIPTION = "Стихи октября";
const UNKNOWN_TEXT = "Что-то пошло не так. Попробуйте ещё раз.";
const OFFLINE_TEXT = "Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.";
const SLOW_TEXT = "Медленное подключение к интернету. Сохранение станет доступно, когда связь улучшится.";

function respond(result: CreateCollectionResult): ActionResponse {
  return { data: result } as ActionResponse;
}

/** A promise the test settles by hand, to observe the form while the action is pending. */
function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: Error) => void;
} {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: Error) => void = () => undefined;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

const titleInput = () => screen.getByRole("textbox", { name: "Название сборника" });
const descriptionArea = () => screen.getByRole("textbox", { name: "Описание (необязательно)" });
const submitButton = () => screen.getByRole("button", { name: /^Созда/ });

function renderForm(): UserEvent {
  const user = userEvent.setup();
  render(<NewCollectionForm />);
  return user;
}

async function fillValid(user: UserEvent) {
  await user.click(titleInput());
  await user.paste(TITLE);
  await user.click(descriptionArea());
  await user.paste(DESCRIPTION);
}

function setConnection(status: ConnectionStatus) {
  vi.mocked(useConnectionStatus).mockReturnValue(status);
}

beforeEach(() => {
  setConnection("online");
});

afterEach(() => {
  vi.resetAllMocks();
  useCollectionListNotice.getState().clearListNotice();
  useSessionExpiredNotice.getState().clearSessionExpired();
});

describe("NewCollectionForm", () => {
  // implements FR-3 of add-poem-collections
  it("shows the title input, the description text area, and «Создать сборник», in order", () => {
    renderForm();

    expect(titleInput().tagName).toBe("INPUT");
    expect(descriptionArea().tagName).toBe("TEXTAREA");
    expect(titleInput().compareDocumentPosition(descriptionArea()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(submitButton()).toHaveTextContent("Создать сборник");
  });

  // implements FR-3, NFR-4 of add-poem-collections
  it.each([
    ["blank", ""],
    ["spaces-only", "   "],
  ])("sends nothing for a %s title, shows «Обязательное поле.» tied to it, and focuses it", async (_case, title) => {
    const user = renderForm();
    if (title !== "") {
      await user.click(titleInput());
      await user.paste(title);
    }

    await user.click(submitButton());

    expect(createCollectionAction).not.toHaveBeenCalled();
    expect(titleInput()).toHaveAccessibleDescription("Обязательное поле.");
    expect(titleInput()).toHaveAttribute("aria-invalid", "true");
    expect(titleInput()).toHaveFocus();
  });

  // implements FR-3, NFR-4 of add-poem-collections
  it("sends nothing for an 81-character title and a 1001-character description, shows both errors, and focuses the title", async () => {
    const user = renderForm();
    await user.click(titleInput());
    await user.paste("а".repeat(81));
    await user.click(descriptionArea());
    await user.paste("б".repeat(1001));

    await user.click(submitButton());

    expect(createCollectionAction).not.toHaveBeenCalled();
    expect(titleInput()).toHaveAccessibleDescription("Не более 80 символов.");
    expect(descriptionArea()).toHaveAccessibleDescription("Не более 1000 символов.");
    expect(titleInput()).toHaveFocus();
  });

  // implements FR-4 of add-poem-collections
  it("sends only the drafts, then stores the created notice and replaces the page with /account/poems", async () => {
    vi.mocked(createCollectionAction).mockResolvedValue(respond({ status: "created", title: TITLE }));
    const user = renderForm();
    await fillValid(user);

    await user.click(submitButton());

    await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith("/account/poems"));
    expect(createCollectionAction).toHaveBeenCalledExactlyOnceWith({ title: TITLE, description: DESCRIPTION });
    expect(useCollectionListNotice.getState().notice).toEqual({ kind: "created", title: TITLE });
    expect(refresh).not.toHaveBeenCalled();
  });

  // implements FR-3, FR-4 of add-poem-collections: CR-01, the queued navigation leaves the form enabled for a moment
  it("sends nothing more after a create succeeded, while the list is still opening", async () => {
    vi.mocked(createCollectionAction).mockResolvedValue(respond({ status: "created", title: TITLE }));
    const user = renderForm();
    await fillValid(user);
    await user.click(submitButton());
    await waitFor(() => expect(submitButton()).toBeEnabled());

    await user.click(submitButton());
    fireEvent.submit(titleInput().closest("form") as HTMLFormElement);

    expect(createCollectionAction).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  // implements FR-3 of add-poem-collections
  it("sends once on a double click and reads «Создание…» with the whole form disabled while sending", async () => {
    const answer = deferred<ActionResponse>();
    vi.mocked(createCollectionAction).mockReturnValue(answer.promise);
    const user = renderForm();
    await fillValid(user);

    await user.dblClick(submitButton());

    expect(createCollectionAction).toHaveBeenCalledTimes(1);
    expect(submitButton()).toHaveTextContent("Создание…");
    expect(submitButton()).toBeDisabled();
    expect(titleInput()).toBeDisabled();
    expect(descriptionArea()).toBeDisabled();
    expect(submitButton().closest("fieldset")).toHaveClass("disabled:opacity-50");

    await act(async () => answer.resolve(respond({ status: "failed", failure: "unavailable" })));
    expect(submitButton()).toHaveTextContent("Создать сборник");
    expect(submitButton()).toBeEnabled();
  });

  // implements FR-4, FR-5, NFR-4 of add-poem-collections
  it.each([
    ["unavailable", "Сохранение сейчас недоступно. Попробуйте позже."],
    ["too-many-collections", "Слишком много новых сборников. Попробуйте позже."],
    ["not-public", "Чтобы создавать сборники, укажите имя и фамилию в профиле автора."],
    ["unknown", UNKNOWN_TEXT],
  ] as const)("shows the %s failure above the submit button, keeps both values, and focuses the alert", async (failure, message) => {
    vi.mocked(createCollectionAction).mockResolvedValue(respond({ status: "failed", failure }));
    const user = renderForm();
    await fillValid(user);

    await user.click(submitButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(message);
    expect(alert.compareDocumentPosition(submitButton()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Focus moves once the transition ends and the fieldset is enabled again.
    await waitFor(() => expect(alert.parentElement).toHaveFocus());
    expect(titleInput()).toHaveValue(TITLE);
    expect(descriptionArea()).toHaveValue(DESCRIPTION);
    expect(replace).not.toHaveBeenCalled();
    expect(useCollectionListNotice.getState().notice).toBeNull();
  });

  // implements FR-4 of add-poem-collections
  it("focuses the alert again when the same failure repeats", async () => {
    vi.mocked(createCollectionAction).mockResolvedValue(respond({ status: "failed", failure: "unavailable" }));
    const user = renderForm();
    await fillValid(user);
    await user.click(submitButton());
    await waitFor(() => expect(screen.getByRole("alert").parentElement).toHaveFocus());

    await user.click(titleInput());
    await user.click(submitButton());

    await waitFor(() => expect(screen.getByRole("alert").parentElement).toHaveFocus());
    expect(createCollectionAction).toHaveBeenCalledTimes(2);
  });

  // implements FR-4 of add-poem-collections
  it("marks the session expired and replaces the page with /login when the session can't be refreshed", async () => {
    vi.mocked(createCollectionAction).mockResolvedValue(respond({ status: "failed", failure: "unauthenticated" }));
    const user = renderForm();
    await fillValid(user);

    await user.click(submitButton());

    await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith("/login"));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(useSessionExpiredNotice.getState().expired).toBe(true);
    expect(useCollectionListNotice.getState().notice).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // implements FR-3, NFR-4 of add-poem-collections
  it("shows the server's field errors and focuses the first", async () => {
    vi.mocked(createCollectionAction).mockResolvedValue(
      respond({ status: "invalid", fieldErrors: { description: "Не более 1000 символов." } }),
    );
    const user = renderForm();
    await fillValid(user);

    await user.click(submitButton());

    await waitFor(() => expect(descriptionArea()).toHaveFocus());
    expect(descriptionArea()).toHaveAccessibleDescription("Не более 1000 символов.");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // implements FR-4 of add-poem-collections
  it("shows the generic failure when the action returns no data, or the call itself fails while online", async () => {
    vi.mocked(createCollectionAction).mockResolvedValueOnce({ serverError: "x" } as ActionResponse);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = renderForm();
    await fillValid(user);

    await user.click(submitButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(UNKNOWN_TEXT);
    await waitFor(() => expect(submitButton()).toBeEnabled());

    vi.mocked(createCollectionAction).mockRejectedValueOnce(new Error("network"));
    await user.click(submitButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(UNKNOWN_TEXT);
    expect(createCollectionAction).toHaveBeenCalledTimes(2);
  });

  it("hides the previous failure when the next submit starts", async () => {
    const answer = deferred<ActionResponse>();
    vi.mocked(createCollectionAction).mockResolvedValueOnce(respond({ status: "failed", failure: "unavailable" }));
    const user = renderForm();
    await fillValid(user);
    await user.click(submitButton());
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await waitFor(() => expect(titleInput()).toBeEnabled());

    vi.mocked(createCollectionAction).mockReturnValueOnce(answer.promise);
    await user.click(submitButton());
    expect(screen.queryByRole("alert")).toBeNull();

    await act(async () => answer.resolve(respond({ status: "created", title: TITLE })));
  });

  // implements NFR-5 of add-poem-collections
  it("logs a rejected call by its error type only", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(createCollectionAction).mockRejectedValue(new TypeError(`Failed to fetch ${TITLE}`));
    const user = renderForm();
    await fillValid(user);

    await user.click(submitButton());

    await screen.findByRole("alert");
    expect(log).toHaveBeenCalledExactlyOnceWith("[collection-management] create call rejected: TypeError");
  });
});

describe("NewCollectionForm: connection", () => {
  // implements FR-14 of add-poem-collections
  it.each([
    ["offline", OFFLINE_TEXT],
    ["slow", SLOW_TEXT],
  ] as const)("while %s, shows the notice above the form and disables only the submit button, until the connection is normal", async (status, text) => {
    setConnection(status);
    const user = userEvent.setup();
    const { rerender } = render(<NewCollectionForm />);
    await fillValid(user);

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(text);
    expect(notice.compareDocumentPosition(titleInput()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(submitButton()).toBeDisabled();
    await user.type(descriptionArea(), "!");
    expect(descriptionArea()).toHaveValue(`${DESCRIPTION}!`);
    fireEvent.submit(titleInput().closest("form") as HTMLFormElement);
    expect(createCollectionAction).not.toHaveBeenCalled();

    setConnection("online");
    rerender(<NewCollectionForm />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(submitButton()).toBeEnabled();
  });

  // implements FR-14 of add-poem-collections
  it("shows no alert for a call rejected after the connection dropped, and keeps the values", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const lost = deferred<ActionResponse>();
    vi.mocked(createCollectionAction).mockReturnValueOnce(lost.promise);
    const user = userEvent.setup();
    const { rerender } = render(<NewCollectionForm />);
    await fillValid(user);
    await user.click(submitButton());

    setConnection("offline");
    rerender(<NewCollectionForm />);
    await act(async () => lost.reject(new Error("network")));

    expect(screen.getByRole("status")).toHaveTextContent(OFFLINE_TEXT);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(titleInput()).toHaveValue(TITLE);
    expect(descriptionArea()).toHaveValue(DESCRIPTION);
    expect(replace).not.toHaveBeenCalled();
  });

  // implements FR-14 of add-poem-collections
  it("shows the unknown alert for a call rejected after the connection turned slow", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const lost = deferred<ActionResponse>();
    vi.mocked(createCollectionAction).mockReturnValueOnce(lost.promise);
    const user = userEvent.setup();
    const { rerender } = render(<NewCollectionForm />);
    await fillValid(user);
    await user.click(submitButton());

    setConnection("slow");
    rerender(<NewCollectionForm />);
    await act(async () => lost.reject(new Error("network")));

    expect(await screen.findByRole("alert")).toHaveTextContent(UNKNOWN_TEXT);
  });
});
