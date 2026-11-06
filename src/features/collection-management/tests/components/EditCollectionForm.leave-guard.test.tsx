import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { Activity } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { askBeforeLeaving } from "@/shared/lib/leave-guard/leave-block.store";
import { LEAVE_ANSWER, type LeaveAnswer } from "@/shared/lib/leave-guard/leave-guard.constants";
import { useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { stubModalDialog } from "@/shared/ui/tests/stub-modal-dialog";

import { updateCollectionAction } from "../../actions/update-collection.actions";
import { EditCollectionForm } from "../../components/EditCollectionForm/EditCollectionForm";
import type { CollectionFormValues } from "../../model/collection-form-values";
import type { UpdateCollectionResult } from "../../model/collection-management.types";
import { useSavedCollectionNotice } from "../../model/saved-collection-notice-ui.store";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../../actions/update-collection.actions", () => ({ updateCollectionAction: vi.fn() }));
vi.mock("@/shared/lib/network/use-connection-status", () => ({ useConnectionStatus: vi.fn() }));

type ActionResponse = Awaited<ReturnType<typeof updateCollectionAction>>;

const COLLECTION_ID = "40000000-0000-4000-8000-000000000031";
const COLLECTION_PATH = `/account/poems/collections/${COLLECTION_ID}`;
const EDIT_PATH = `${COLLECTION_PATH}/edit`;
const AUTHORS_PATH = "/authors";
const STORED: CollectionFormValues = { title: "Осенний цикл", description: "Стихи октября" };
const CHANGED_TITLE = "Осенний цикл.";

const DIALOG_NAME = "Есть несохранённые изменения";
const LINK_BODY = "Сначала сохраните изменения.";
const SIGN_OUT_BODY = "Если выйти сейчас, изменения пропадут.";
const STAY = "Продолжить редактирование";
const LEAVE = "Выйти без сохранения";

stubModalDialog();

// A link click the guard lets through reaches this bubbling listener, which stops jsdom's own navigation.
const passedThrough = vi.fn();
function recordLinkClick(event: MouseEvent) {
  if (!(event.target instanceof Element) || event.target.closest("a[href]") === null) return;
  event.preventDefault();
  passedThrough();
}

beforeEach(() => {
  vi.mocked(useConnectionStatus).mockReturnValue("online");
  // The edit page's own address, so a same-page `#` link resolves to it.
  window.history.pushState({}, "", EDIT_PATH);
  document.addEventListener("click", recordLinkClick);
});

afterEach(() => {
  document.removeEventListener("click", recordLinkClick);
  vi.resetAllMocks();
  useSavedCollectionNotice.getState().clearSavedNotice();
  window.history.pushState({}, "", "/");
});

function respond(result: UpdateCollectionResult): ActionResponse {
  return { data: result } as ActionResponse;
}

/** A promise the test settles by hand, to observe the form while the action is pending. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

function Page({ mode = "visible" }: { readonly mode?: "visible" | "hidden" }) {
  return (
    <Activity mode={mode}>
      {/* The anchor `next/link` renders in the header: the guard sees only the DOM. */}
      <a href={AUTHORS_PATH}>Наши авторы</a>
      <a href={COLLECTION_PATH}>К сборнику</a>
      <a href={`${EDIT_PATH}#top`}>Наверх</a>
      <EditCollectionForm collectionId={COLLECTION_ID} stored={STORED} />
    </Activity>
  );
}

function renderPage() {
  const user = userEvent.setup();
  const view = render(<Page />);
  return { user, rerender: (mode: "visible" | "hidden") => view.rerender(<Page mode={mode} />) };
}

const link = (name: string) => screen.getByRole("link", { name });
const titleInput = () => screen.getByRole("textbox", { name: "Название сборника" });
const saveButton = () => screen.getByRole("button", { name: /^Сохран/ });
/** The page's only dialog, open or not: a closed `<dialog>` has no role or name to find it by. */
function leaveDialog(): HTMLDialogElement {
  const dialog = document.querySelector("dialog");
  if (dialog === null) throw new Error("no leave dialog rendered");
  return dialog;
}

async function changeTitle(user: UserEvent) {
  await user.click(titleInput());
  await user.keyboard("{End}.");
}

/** Starts a save the test answers later; the guard stays on while it sends. */
async function startSave(user: UserEvent) {
  const call = deferred<ActionResponse>();
  vi.mocked(updateCollectionAction).mockReturnValueOnce(call.promise);
  await changeTitle(user);
  await user.click(saveButton());
  return call;
}

/** The header's «Выйти» asking through the shared store, as `SignOutButton` does. */
function askAsSignOut(): Promise<LeaveAnswer> {
  let answer: Promise<LeaveAnswer> = Promise.resolve(LEAVE_ANSWER.leave);
  act(() => {
    answer = askBeforeLeaving();
  });
  return answer;
}

/** Escape on a modal dialog: a cancelable `cancel` event, then the close the browser makes. */
function pressEscape(dialog: HTMLDialogElement) {
  const cancel = new Event("cancel", { cancelable: true });
  fireEvent(dialog, cancel);
  if (!cancel.defaultPrevented) act(() => dialog.close());
}

// The poem edit form's guard tests, repeated for the collection paths (design D12).
describe("EditCollectionForm: leave guard", () => {
  // implements FR-12 of add-poem-collections: an unchanged form blocks nothing
  it("blocks no link and asks nothing while the form is unchanged", async () => {
    const { user } = renderPage();

    await user.click(link("Наши авторы"));

    expect(passedThrough).toHaveBeenCalledOnce();
    expect(leaveDialog()).not.toHaveAttribute("open");
    await expect(askAsSignOut()).resolves.toBe(LEAVE_ANSWER.leave);
  });

  // implements FR-12, NFR-4 of add-poem-collections: a blocked link opens the link form, focus comes back to the link
  it("blocks another page's link while changed, then gives focus back to it", async () => {
    const { user } = renderPage();
    await changeTitle(user);

    await user.click(link("Наши авторы"));

    expect(passedThrough).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: DIALOG_NAME })).toHaveAttribute("open");
    expect(screen.getByText(LINK_BODY)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: STAY })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: STAY }));

    expect(leaveDialog()).not.toHaveAttribute("open");
    expect(link("Наши авторы")).toHaveFocus();
    expect(titleInput()).toHaveValue(CHANGED_TITLE);
  });

  // implements FR-12, NFR-4 of add-poem-collections: the corner button and Escape close the link form too
  it("closes the link form on the corner button and on Escape, focus back on the link each time", async () => {
    const { user } = renderPage();
    await changeTitle(user);

    await user.click(link("Наши авторы"));
    await user.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(leaveDialog()).not.toHaveAttribute("open");
    expect(link("Наши авторы")).toHaveFocus();

    await user.click(link("Наши авторы"));
    pressEscape(leaveDialog());
    expect(leaveDialog()).not.toHaveAttribute("open");
    expect(link("Наши авторы")).toHaveFocus();
  });

  // implements NFR-4 of add-poem-collections: a link gone by the close: the dialog still closes, nothing thrown
  it("closes quietly when the clicked link is gone from the page by then", async () => {
    const { user } = renderPage();
    await changeTitle(user);
    // Outside React's tree, so the test may remove it.
    const outside = document.createElement("a");
    outside.href = AUTHORS_PATH;
    outside.textContent = "Ещё одна ссылка";
    document.body.append(outside);

    await user.click(outside);
    outside.remove();
    await user.click(screen.getByRole("button", { name: STAY }));

    expect(leaveDialog()).not.toHaveAttribute("open");
    expect(outside).not.toHaveFocus();
    expect(titleInput()).toHaveValue(CHANGED_TITLE);
  });

  // implements FR-12 of add-poem-collections: this collection's page and the edit page itself stay reachable
  it("lets the collection's own page and a same-page link through while changed", async () => {
    const { user } = renderPage();
    await changeTitle(user);

    await user.click(link("К сборнику"));
    await user.click(link("Наверх"));

    expect(passedThrough).toHaveBeenCalledTimes(2);
    expect(leaveDialog()).not.toHaveAttribute("open");
  });

  // implements FR-12 of add-poem-collections: still on while sending, off once saved, before the navigation
  it("stays on while a save sends and turns off on a saved result", async () => {
    const { user } = renderPage();
    const call = await startSave(user);

    await user.click(link("Наши авторы"));
    expect(passedThrough).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: STAY }));

    await act(async () => call.resolve(respond({ status: "saved" })));
    expect(push).toHaveBeenCalledWith(COLLECTION_PATH);

    await user.click(link("Наши авторы"));
    expect(passedThrough).toHaveBeenCalledOnce();
  });
});

describe("EditCollectionForm: sign-out question", () => {
  // implements FR-12, NFR-4 of add-poem-collections: the sign-out form, focused on stay
  it("opens the sign-out form with «Продолжить редактирование» focused, and stays on it", async () => {
    const { user } = renderPage();
    await changeTitle(user);

    const answer = askAsSignOut();

    expect(leaveDialog()).toHaveAttribute("open");
    expect(screen.getByText(SIGN_OUT_BODY)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: STAY })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: STAY }));

    await expect(answer).resolves.toBe(LEAVE_ANSWER.stay);
    expect(leaveDialog()).not.toHaveAttribute("open");
    expect(titleInput()).toHaveValue(CHANGED_TITLE);
  });

  // implements FR-12 of add-poem-collections: the corner button and Escape answer stay too
  it("answers stay on the corner button and on Escape", async () => {
    const { user } = renderPage();
    await changeTitle(user);

    const byCorner = askAsSignOut();
    await user.click(screen.getByRole("button", { name: "Закрыть" }));
    await expect(byCorner).resolves.toBe(LEAVE_ANSWER.stay);

    const byEscape = askAsSignOut();
    pressEscape(leaveDialog());
    await expect(byEscape).resolves.toBe(LEAVE_ANSWER.stay);
  });

  // implements FR-12 of add-poem-collections: only «Выйти без сохранения» answers leave
  it("answers leave on «Выйти без сохранения» and closes the dialog", async () => {
    const { user } = renderPage();
    await changeTitle(user);

    const answer = askAsSignOut();
    await user.click(screen.getByRole("button", { name: LEAVE }));

    await expect(answer).resolves.toBe(LEAVE_ANSWER.leave);
    expect(leaveDialog()).not.toHaveAttribute("open");
  });

  // implements FR-12 of add-poem-collections: one question at a time
  it("settles an earlier question dismissed when a newer one is asked", async () => {
    const { user } = renderPage();
    await changeTitle(user);

    const first = askAsSignOut();
    const second = askAsSignOut();
    await user.click(screen.getByRole("button", { name: STAY }));

    await expect(first).resolves.toBe(LEAVE_ANSWER.dismissed);
    await expect(second).resolves.toBe(LEAVE_ANSWER.stay);
  });
});

describe("EditCollectionForm: the dialog and a save's result", () => {
  // implements FR-12 of add-poem-collections: a saved result while the dialog is open closes it
  it("closes the sign-out form on a saved result and answers dismissed", async () => {
    const { user } = renderPage();
    const call = await startSave(user);
    const answer = askAsSignOut();

    await act(async () => call.resolve(respond({ status: "saved" })));

    expect(leaveDialog()).not.toHaveAttribute("open");
    await expect(answer).resolves.toBe(LEAVE_ANSWER.dismissed);
    expect(push).toHaveBeenCalledWith(COLLECTION_PATH);
  });

  // implements FR-12 of add-poem-collections: a saved result closes the link form too
  it("closes the link form on a saved result", async () => {
    const { user } = renderPage();
    const call = await startSave(user);
    await user.click(link("Наши авторы"));

    await act(async () => call.resolve(respond({ status: "saved" })));

    expect(leaveDialog()).not.toHaveAttribute("open");
  });

  // implements FR-12, NFR-4 of add-poem-collections: a failure during the link form takes focus once it closes
  it("focuses the failure alert after the link form closes on a save that failed meanwhile", async () => {
    const { user } = renderPage();
    const call = await startSave(user);
    await user.click(link("Наши авторы"));

    await act(async () => call.resolve(respond({ status: "failed", failure: "unavailable" })));
    expect(leaveDialog()).toHaveAttribute("open");
    await user.click(screen.getByRole("button", { name: STAY }));

    expect(screen.getByRole("alert").parentElement).toHaveFocus();
  });

  // implements NFR-4 of add-poem-collections: an alert shown before the dialog opened doesn't take focus on close
  it("gives focus back to the link when the failure alert was already there before the link form opened", async () => {
    const { user } = renderPage();
    const call = await startSave(user);
    await act(async () => call.resolve(respond({ status: "failed", failure: "unavailable" })));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.click(link("Наши авторы"));
    await user.click(screen.getByRole("button", { name: STAY }));

    expect(link("Наши авторы")).toHaveFocus();
  });

  // implements FR-12, NFR-4 of add-poem-collections: a failure during the sign-out form: alert focus, answer dismissed
  it("focuses the failure alert and answers dismissed after the sign-out form closes on a failed save", async () => {
    const { user } = renderPage();
    const call = await startSave(user);
    const answer = askAsSignOut();

    await act(async () => call.resolve(respond({ status: "failed", failure: "unavailable" })));
    await user.click(screen.getByRole("button", { name: STAY }));

    await expect(answer).resolves.toBe(LEAVE_ANSWER.dismissed);
    expect(screen.getByRole("alert").parentElement).toHaveFocus();
  });
});

describe("EditCollectionForm: a hidden edit page", () => {
  // implements FR-12 of add-poem-collections: Back/Forward hides the page; the dialog doesn't come back with it
  it("closes the dialog and dismisses the question on hide, and keeps the draft when visible again", async () => {
    const { user, rerender } = renderPage();
    await changeTitle(user);
    const answer = askAsSignOut();

    rerender("hidden");
    await expect(answer).resolves.toBe(LEAVE_ANSWER.dismissed);
    rerender("visible");

    expect(leaveDialog()).not.toHaveAttribute("open");
    expect(titleInput()).toHaveValue(CHANGED_TITLE);
  });

  // implements FR-12 of add-poem-collections: the link form closes on hide too
  it("closes the link form on hide and shows none when visible again", async () => {
    const { user, rerender } = renderPage();
    await changeTitle(user);
    await user.click(link("Наши авторы"));
    expect(leaveDialog()).toHaveAttribute("open");

    rerender("hidden");
    rerender("visible");

    expect(leaveDialog()).not.toHaveAttribute("open");
  });
});
