import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type ConnectionStatus, useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";
import { stubModalDialog } from "@/shared/ui/tests/stub-modal-dialog";

import { deleteCollectionAction } from "../../actions/delete-collection.actions";
import { DeleteCollectionButton } from "../../components/DeleteCollectionButton/DeleteCollectionButton";
import { useCollectionListNotice } from "../../model/collection-list-notice-ui.store";
import type { DeleteCollectionResult } from "../../model/collection-management.types";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("../../actions/delete-collection.actions", () => ({ deleteCollectionAction: vi.fn() }));
vi.mock("@/shared/lib/network/use-connection-status", () => ({ useConnectionStatus: vi.fn() }));

type ActionResponse = Awaited<ReturnType<typeof deleteCollectionAction>>;

const COLLECTION_ID = "40000000-0000-4000-8000-000000000031";
const TITLE = "Осенний цикл";
const STORED_TITLE = "Осенний цикл 2026";
const FAILURE_TEXT = "Не удалось удалить сборник. Попробуйте позже.";
const OFFLINE_TEXT = "Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.";
const SLOW_TEXT = "Медленное подключение к интернету. Сохранение станет доступно, когда связь улучшится.";

stubModalDialog();

function setConnection(status: ConnectionStatus) {
  vi.mocked(useConnectionStatus).mockReturnValue(status);
}

beforeEach(() => {
  setConnection("online");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  useCollectionListNotice.getState().clearListNotice();
  useSessionExpiredNotice.getState().clearSessionExpired();
});

function respond(result: DeleteCollectionResult): ActionResponse {
  return { data: result } as ActionResponse;
}

/** A promise the test settles by hand, to observe the dialog while the action is pending. */
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

const opener = () => screen.getByRole("button", { name: "Удалить сборник" });
const dialogElement = () => screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;
const inDialog = () => within(dialogElement());
const cancelButton = () => inDialog().getByRole("button", { name: "Отмена", hidden: true });
const confirmButton = () => inDialog().getByRole("button", { name: /^Удал/, hidden: true });
const closeButton = () => inDialog().getByRole("button", { name: "Закрыть", hidden: true });

/** Escape on a native dialog: `cancel` first, then the close unless it was prevented. */
function pressEscape() {
  const dialog = dialogElement();
  const cancel = new Event("cancel", { cancelable: true });
  dialog.dispatchEvent(cancel);
  if (!cancel.defaultPrevented) dialog.close();
}

function clickBackdrop() {
  fireEvent.pointerDown(dialogElement());
  fireEvent.click(dialogElement());
}

function renderButton() {
  return render(<DeleteCollectionButton collectionId={COLLECTION_ID} title={TITLE} />);
}

async function renderOpen(): Promise<UserEvent> {
  const user = userEvent.setup();
  renderButton();
  await user.click(opener());
  return user;
}

describe("DeleteCollectionButton: dialog", () => {
  // implements FR-6, FR-13, NFR-6 of add-poem-collections
  it("renders the danger opener that announces a dialog, closed", () => {
    renderButton();

    expect(opener()).toHaveClass("danger");
    expect(opener()).toHaveAttribute("aria-haspopup", "dialog");
    expect(opener()).not.toHaveAttribute("aria-disabled");
    expect(dialogElement().open).toBe(false);
  });

  // implements FR-13, NFR-4 of add-poem-collections
  it("opens a modal titled by its heading, naming the collection, with focus on cancel and nothing sent", async () => {
    await renderOpen();

    const dialog = dialogElement();
    expect(dialog.open).toBe(true);
    expect(dialog).toHaveAccessibleName("Удалить сборник?");
    expect(dialog).toHaveTextContent("Сборник «Осенний цикл» будет удалён без возможности восстановления.");
    expect(confirmButton()).toHaveTextContent(/^Удалить$/);
    expect(confirmButton()).toHaveClass("danger");
    expect(cancelButton()).toHaveFocus();
    expect(deleteCollectionAction).not.toHaveBeenCalled();
  });

  // implements FR-13, NFR-4 of add-poem-collections
  it.each([
    ["cancel", () => fireEvent.click(cancelButton())],
    ["the corner button", () => fireEvent.click(closeButton())],
    ["Escape", pressEscape],
    ["the backdrop", clickBackdrop],
  ])("closes on %s, sends nothing, and returns focus to the opener", async (_path, closeBy) => {
    await renderOpen();

    act(() => closeBy());

    expect(dialogElement().open).toBe(false);
    expect(deleteCollectionAction).not.toHaveBeenCalled();
    expect(opener()).toHaveFocus();
  });
});

describe("DeleteCollectionButton: sending and outcomes", () => {
  // implements FR-13 of add-poem-collections
  it("shows the sending state with every control disabled, and Escape and the backdrop leave it open", async () => {
    const pending = deferred<ActionResponse>();
    vi.mocked(deleteCollectionAction).mockReturnValue(pending.promise);
    const user = await renderOpen();

    await user.click(confirmButton());

    expect(confirmButton()).toHaveTextContent("Удаление…");
    expect(confirmButton()).toBeDisabled();
    expect(cancelButton()).toBeDisabled();
    expect(closeButton()).toBeDisabled();
    act(() => {
      pressEscape();
      clickBackdrop();
    });
    expect(dialogElement().open).toBe(true);
    expect(deleteCollectionAction).toHaveBeenCalledExactlyOnceWith({ collectionId: COLLECTION_ID });

    await act(async () => pending.resolve(respond({ status: "failed", failure: "unknown" })));
  });

  // implements FR-13 of add-poem-collections
  it("sends one request for a double click", async () => {
    const pending = deferred<ActionResponse>();
    vi.mocked(deleteCollectionAction).mockReturnValue(pending.promise);
    await renderOpen();

    const button = confirmButton();
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(deleteCollectionAction).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(respond({ status: "failed", failure: "unknown" })));
  });

  // implements FR-13, FR-15 of add-poem-collections
  it("stores the deleted notice with the stored title, closes the dialog, and replaces the page with the list", async () => {
    vi.mocked(deleteCollectionAction).mockResolvedValue(respond({ status: "deleted", title: STORED_TITLE }));
    // The transition is still pending at the navigation: the dialog must already be closable there.
    let closableAtNavigation: boolean | undefined;
    replace.mockImplementationOnce(() => {
      closableAtNavigation = !closeButton().hasAttribute("disabled");
    });
    const user = await renderOpen();

    await user.click(confirmButton());

    await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith("/account/poems"));
    expect(closableAtNavigation).toBe(true);
    expect(useCollectionListNotice.getState().notice).toEqual({ kind: "deleted", title: STORED_TITLE });
    expect(dialogElement().open).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
  });

  // implements FR-13 of add-poem-collections
  it("stores the already-deleted notice and goes to the list when there is nothing to delete", async () => {
    vi.mocked(deleteCollectionAction).mockResolvedValue(respond({ status: "not-found" }));
    const user = await renderOpen();

    await user.click(confirmButton());

    await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith("/account/poems"));
    expect(useCollectionListNotice.getState().notice).toEqual({ kind: "already-deleted" });
    expect(dialogElement().open).toBe(false);
  });

  // implements FR-13 of add-poem-collections
  it("marks the session expired, closes the dialog, replaces the page with sign-in, then refreshes the header", async () => {
    vi.mocked(deleteCollectionAction).mockResolvedValue(respond({ status: "failed", failure: "unauthenticated" }));
    const user = await renderOpen();

    await user.click(confirmButton());

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(replace).toHaveBeenCalledExactlyOnceWith("/login");
    expect(replace.mock.invocationCallOrder[0]).toBeLessThan(refresh.mock.invocationCallOrder[0] ?? 0);
    expect(useSessionExpiredNotice.getState().expired).toBe(true);
    expect(useCollectionListNotice.getState().notice).toBeNull();
    expect(dialogElement().open).toBe(false);
  });

  // implements FR-15 of admin-moderation
  it("keeps the dialog open with the restricted message, not the session-expired path, when the account is blocked", async () => {
    vi.mocked(deleteCollectionAction).mockResolvedValue(respond({ status: "failed", failure: "restricted" }));
    const user = await renderOpen();

    await user.click(confirmButton());

    expect(await inDialog().findByRole("alert", { hidden: true })).toHaveTextContent(
      "Ваш аккаунт заблокирован: изменения недоступны.",
    );
    expect(dialogElement().open).toBe(true);
    expect(replace).not.toHaveBeenCalled();
    expect(useSessionExpiredNotice.getState().expired).toBe(false);
    expect(useCollectionListNotice.getState().notice).toBeNull();
    expect(deleteCollectionAction).toHaveBeenCalledTimes(1);
  });

  // implements FR-13, NFR-4 of add-poem-collections
  it.each<[string, () => Promise<ActionResponse>]>([
    ["unavailable", async () => respond({ status: "failed", failure: "unavailable" })],
    ["unknown", async () => respond({ status: "failed", failure: "unknown" })],
    ["a server error", async () => ({ serverError: "Something went wrong" }) as ActionResponse],
    ["a rejected request while online", async () => Promise.reject(new Error("network"))],
  ])("keeps the dialog open with the alert and focus on confirm for %s", async (_case, answer) => {
    vi.mocked(deleteCollectionAction).mockImplementation(answer);
    const user = await renderOpen();

    await user.click(confirmButton());

    expect(await inDialog().findByRole("alert", { hidden: true })).toHaveTextContent(FAILURE_TEXT);
    await waitFor(() => expect(confirmButton()).toHaveFocus());
    expect(dialogElement().open).toBe(true);
    expect(replace).not.toHaveBeenCalled();
    expect(useCollectionListNotice.getState().notice).toBeNull();
  });

  // implements FR-13 of add-poem-collections
  it("opens again without the alert after a failure", async () => {
    vi.mocked(deleteCollectionAction).mockResolvedValueOnce(respond({ status: "failed", failure: "unavailable" }));
    const user = await renderOpen();
    await user.click(confirmButton());
    await screen.findByRole("alert", { hidden: true });

    await user.click(cancelButton());
    await user.click(opener());

    expect(dialogElement().open).toBe(true);
    expect(screen.queryByRole("alert", { hidden: true })).toBeNull();
  });

  // implements FR-13 of add-poem-collections
  it("hides the alert while a retry is sending, then deletes", async () => {
    vi.mocked(deleteCollectionAction).mockResolvedValueOnce(respond({ status: "failed", failure: "unavailable" }));
    const user = await renderOpen();
    await user.click(confirmButton());
    await screen.findByRole("alert", { hidden: true });
    const pending = deferred<ActionResponse>();
    vi.mocked(deleteCollectionAction).mockReturnValueOnce(pending.promise);

    await user.click(confirmButton());
    expect(screen.queryByRole("alert", { hidden: true })).toBeNull();

    await act(async () => pending.resolve(respond({ status: "deleted", title: TITLE })));
    await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith("/account/poems"));
  });

  // implements NFR-5 of add-poem-collections
  it("logs a rejected call by the error's type only", async () => {
    vi.mocked(deleteCollectionAction).mockRejectedValue(new TypeError(`fetch ${COLLECTION_ID} ${TITLE}`));
    const user = await renderOpen();

    await user.click(confirmButton());
    await screen.findByRole("alert", { hidden: true });

    expect(console.error).toHaveBeenCalledExactlyOnceWith("[collection-management] delete call rejected: TypeError");
  });
});

describe("DeleteCollectionButton: connection", () => {
  // implements FR-14, NFR-4 of add-poem-collections
  it.each(["offline", "slow"] as const)(
    "while %s, the opener is aria-disabled, still focusable, and ignores presses",
    async (status) => {
      setConnection(status);
      const user = userEvent.setup();
      renderButton();

      expect(opener()).toHaveAttribute("aria-disabled", "true");
      expect(opener()).not.toBeDisabled();
      await user.tab();
      expect(opener()).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(dialogElement().open).toBe(false);
      await user.click(opener());
      expect(dialogElement().open).toBe(false);
    },
  );

  // implements FR-14 of add-poem-collections
  it.each([
    ["offline", OFFLINE_TEXT],
    ["slow", SLOW_TEXT],
  ] as const)(
    "while %s with the dialog open, shows the notice above its buttons, disables only confirm, and enables it again online",
    async (status, text) => {
      const user = userEvent.setup();
      const { rerender } = renderButton();
      await user.click(opener());

      // The hook's new value re-renders the button in the app; here a re-render with the mocked value does.
      setConnection(status);
      rerender(<DeleteCollectionButton collectionId={COLLECTION_ID} title={TITLE} />);

      const notice = inDialog().getByRole("status", { hidden: true });
      expect(notice).toHaveTextContent(text);
      expect(notice.compareDocumentPosition(confirmButton()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(confirmButton()).toBeDisabled();
      expect(cancelButton()).toBeEnabled();
      fireEvent.click(confirmButton());
      expect(deleteCollectionAction).not.toHaveBeenCalled();

      setConnection("online");
      rerender(<DeleteCollectionButton collectionId={COLLECTION_ID} title={TITLE} />);

      expect(inDialog().queryByRole("status", { hidden: true })).toBeNull();
      expect(confirmButton()).toBeEnabled();
    },
  );

  // implements FR-14, NFR-4 of add-poem-collections
  it("returns focus to the aria-disabled opener when the dialog is cancelled offline", async () => {
    const user = userEvent.setup();
    const { rerender } = renderButton();
    await user.click(opener());
    setConnection("offline");
    rerender(<DeleteCollectionButton collectionId={COLLECTION_ID} title={TITLE} />);

    await user.click(cancelButton());

    expect(dialogElement().open).toBe(false);
    expect(opener()).toHaveAttribute("aria-disabled", "true");
    expect(opener()).toHaveFocus();
  });

  // implements FR-14 of add-poem-collections
  it("shows no failure text for a call rejected after the connection dropped, and keeps the dialog open", async () => {
    const pending = deferred<ActionResponse>();
    vi.mocked(deleteCollectionAction).mockReturnValue(pending.promise);
    const user = userEvent.setup();
    const { rerender } = renderButton();
    await user.click(opener());
    await user.click(confirmButton());

    setConnection("offline");
    rerender(<DeleteCollectionButton collectionId={COLLECTION_ID} title={TITLE} />);
    await act(async () => pending.reject(new Error("network")));

    expect(inDialog().getByRole("status", { hidden: true })).toHaveTextContent(OFFLINE_TEXT);
    expect(screen.queryByRole("alert", { hidden: true })).toBeNull();
    expect(dialogElement().open).toBe(true);
    expect(replace).not.toHaveBeenCalled();
  });

  // implements FR-13, FR-14 of add-poem-collections
  it("shows the failure text next to the slow notice for a call rejected after the connection turned slow", async () => {
    const pending = deferred<ActionResponse>();
    vi.mocked(deleteCollectionAction).mockReturnValue(pending.promise);
    const user = userEvent.setup();
    const { rerender } = renderButton();
    await user.click(opener());
    await user.click(confirmButton());

    setConnection("slow");
    rerender(<DeleteCollectionButton collectionId={COLLECTION_ID} title={TITLE} />);
    await act(async () => pending.reject(new Error("network")));

    expect(inDialog().getByRole("alert", { hidden: true })).toHaveTextContent(FAILURE_TEXT);
    expect(inDialog().getByRole("status", { hidden: true })).toHaveTextContent(SLOW_TEXT);
    expect(dialogElement().open).toBe(true);
    expect(replace).not.toHaveBeenCalled();
  });
});
