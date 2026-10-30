import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";

import { deletePoemAction } from "../../actions/delete-poem.actions";
import { DeletePoemButton } from "../../components/DeletePoemButton/DeletePoemButton";
import { useDeletedPoemNotice } from "../../model/deleted-poem-notice-ui.store";
import type { DeletePoemResult } from "../../model/poem-management.types";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("../../actions/delete-poem.actions", () => ({ deletePoemAction: vi.fn() }));

type ActionResponse = Awaited<ReturnType<typeof deletePoemAction>>;

const POEM_ID = "30000000-0000-4000-8000-000000000021";
const TITLE = "Первый снег";
const FAILURE_TEXT = "Не удалось удалить произведение. Попробуйте позже.";

// jsdom has no modal dialog: stand in for the parts the component relies on, as the browser does them.
const nativeShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const nativeClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      if (!this.open) return;
      this.open = false;
      this.dispatchEvent(new Event("close"));
    },
  });
});

afterAll(() => {
  if (nativeShowModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", nativeShowModal);
  if (nativeClose) Object.defineProperty(HTMLDialogElement.prototype, "close", nativeClose);
});

afterEach(() => {
  vi.clearAllMocks();
  useDeletedPoemNotice.getState().clearDeletedNotice();
  useSessionExpiredNotice.getState().clearSessionExpired();
});

function respond(result: DeletePoemResult): ActionResponse {
  return { data: result } as ActionResponse;
}

/** A promise the test settles by hand, to observe the dialog while the action is pending. */
function deferred<T>(): { readonly promise: Promise<T>; readonly resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

const opener = () => screen.getByRole("button", { name: "Удалить произведение" });
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

async function renderOpen(): Promise<UserEvent> {
  const user = userEvent.setup();
  render(<DeletePoemButton poemId={POEM_ID} title={TITLE} />);
  await user.click(opener());
  return user;
}

async function failOnce(user: UserEvent) {
  vi.mocked(deletePoemAction).mockResolvedValueOnce(respond({ status: "failed", failure: "unavailable" }));
  await user.click(confirmButton());
  await screen.findByRole("alert");
}

describe("DeletePoemButton", () => {
  // implements FR-1, NFR-6 of delete-poem
  it("renders the danger opener that announces a dialog", () => {
    render(<DeletePoemButton poemId={POEM_ID} title={TITLE} />);

    expect(opener()).toHaveClass("danger");
    expect(opener()).toHaveAttribute("aria-haspopup", "dialog");
    expect(dialogElement().open).toBe(false);
  });

  // implements FR-2, NFR-4, NFR-7 of delete-poem
  it("opens a modal titled by its heading, naming the poem, with focus on cancel and nothing sent", async () => {
    await renderOpen();

    const dialog = dialogElement();
    expect(dialog.open).toBe(true);
    expect(dialog).toHaveAccessibleName("Удалить произведение?");
    expect(dialog).toHaveTextContent("«Первый снег» будет удалено без возможности восстановления.");
    expect(confirmButton()).toHaveTextContent(/^Удалить$/);
    expect(cancelButton()).toHaveFocus();
    expect(deletePoemAction).not.toHaveBeenCalled();
  });

  // implements FR-2 of delete-poem
  it.each([
    ["cancel", () => fireEvent.click(cancelButton())],
    ["the corner button", () => fireEvent.click(closeButton())],
    ["Escape", pressEscape],
    ["the backdrop", clickBackdrop],
  ])("closes on %s, sends nothing, and returns focus to the opener", async (_path, closeBy) => {
    await renderOpen();

    act(() => closeBy());

    expect(dialogElement().open).toBe(false);
    expect(deletePoemAction).not.toHaveBeenCalled();
    expect(opener()).toHaveFocus();
  });

  // implements FR-3 of delete-poem
  it("shows the sending state with every control disabled, and Escape and the backdrop leave it open", async () => {
    const pending = deferred<ActionResponse>();
    vi.mocked(deletePoemAction).mockReturnValue(pending.promise);
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
    expect(deletePoemAction).toHaveBeenCalledExactlyOnceWith({ poemId: POEM_ID });

    await act(async () => pending.resolve(respond({ status: "failed", failure: "unknown" })));
  });

  // implements FR-3 of delete-poem
  it("sends one request for a double click", async () => {
    const pending = deferred<ActionResponse>();
    vi.mocked(deletePoemAction).mockReturnValue(pending.promise);
    await renderOpen();

    const button = confirmButton();
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(deletePoemAction).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(respond({ status: "failed", failure: "unknown" })));
  });

  // implements FR-3 of delete-poem
  it("stores the deleted notice with the title, closes the dialog, and replaces the page with the list", async () => {
    vi.mocked(deletePoemAction).mockResolvedValue(respond({ status: "deleted" }));
    const user = await renderOpen();

    await user.click(confirmButton());

    await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith("/account/poems"));
    expect(useDeletedPoemNotice.getState().notice).toEqual({ kind: "deleted", title: TITLE });
    expect(dialogElement().open).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
  });

  // implements FR-4 of delete-poem
  it("stores the already-deleted notice and goes to the list when there is nothing to delete", async () => {
    vi.mocked(deletePoemAction).mockResolvedValue(respond({ status: "not-found" }));
    const user = await renderOpen();

    await user.click(confirmButton());

    await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith("/account/poems"));
    expect(useDeletedPoemNotice.getState().notice).toEqual({ kind: "already-deleted" });
    expect(dialogElement().open).toBe(false);
  });

  // implements FR-6 of delete-poem
  it("marks the session expired, replaces the page with sign-in, then refreshes the header", async () => {
    vi.mocked(deletePoemAction).mockResolvedValue(respond({ status: "failed", failure: "unauthenticated" }));
    const user = await renderOpen();

    await user.click(confirmButton());

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(replace).toHaveBeenCalledExactlyOnceWith("/login");
    expect(replace.mock.invocationCallOrder[0]).toBeLessThan(refresh.mock.invocationCallOrder[0] ?? 0);
    expect(useSessionExpiredNotice.getState().expired).toBe(true);
    expect(useDeletedPoemNotice.getState().notice).toBeNull();
    expect(dialogElement().open).toBe(false);
  });

  // implements FR-5, NFR-4 of delete-poem
  it.each<[string, () => Promise<ActionResponse>]>([
    ["unavailable", async () => respond({ status: "failed", failure: "unavailable" })],
    ["unknown", async () => respond({ status: "failed", failure: "unknown" })],
    ["a server error", async () => ({ serverError: "Something went wrong" }) as ActionResponse],
    ["validation errors", async () => ({ validationErrors: { formErrors: [], fieldErrors: { poemId: ["x"] } } }) as ActionResponse],
    ["a rejected request", async () => Promise.reject(new Error("network"))],
  ])("keeps the dialog open with the alert and focus on confirm for %s", async (_case, answer) => {
    vi.mocked(deletePoemAction).mockImplementation(answer);
    const user = await renderOpen();

    await user.click(confirmButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(FAILURE_TEXT);
    await waitFor(() => expect(confirmButton()).toHaveFocus());
    expect(dialogElement().open).toBe(true);
    expect(replace).not.toHaveBeenCalled();
    expect(useDeletedPoemNotice.getState().notice).toBeNull();
  });

  // implements FR-5 of delete-poem
  it("opens again without the alert after a failure", async () => {
    const user = await renderOpen();
    await failOnce(user);

    await user.click(cancelButton());
    await user.click(opener());

    expect(dialogElement().open).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // implements FR-5 of delete-poem
  it("hides the alert while a retry is sending, then deletes", async () => {
    const user = await renderOpen();
    await failOnce(user);
    const pending = deferred<ActionResponse>();
    vi.mocked(deletePoemAction).mockReturnValueOnce(pending.promise);

    await user.click(confirmButton());
    expect(screen.queryByRole("alert")).toBeNull();

    await act(async () => pending.resolve(respond({ status: "deleted" })));
    await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith("/account/poems"));
  });
});
