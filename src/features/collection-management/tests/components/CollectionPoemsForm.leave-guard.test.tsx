import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { Activity } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { askBeforeLeaving } from "@/shared/lib/leave-guard/leave-block.store";
import { LEAVE_ANSWER, type LeaveAnswer } from "@/shared/lib/leave-guard/leave-guard.constants";
import { type ConnectionStatus, useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { stubModalDialog } from "@/shared/ui/tests/stub-modal-dialog";

import { saveCollectionPoemsAction } from "../../actions/save-collection-poems.actions";
import { CollectionPoemsForm } from "../../components/CollectionPoemsForm/CollectionPoemsForm";
import {
  COLLECTION_POEMS_LEAVE_COPY,
  SAVE_COLLECTION_POEMS_FAILURE_MESSAGES,
} from "../../model/collection-management-messages";
import type { CollectionPoemChoice, SaveCollectionPoemsResult } from "../../model/collection-management.types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../../actions/save-collection-poems.actions", () => ({ saveCollectionPoemsAction: vi.fn() }));
vi.mock("@/shared/lib/network/use-connection-status", () => ({ useConnectionStatus: vi.fn() }));

type ActionResponse = Awaited<ReturnType<typeof saveCollectionPoemsAction>>;

const COLLECTION_ID = "40000000-0000-4000-8000-000000000031";
const POEMS_PATH = `/account/poems/collections/${COLLECTION_ID}/poems`;
const AUTHORS_PATH = "/authors";
const IN_COLLECTION: CollectionPoemChoice = {
  id: "50000000-0000-4000-8000-000000000002",
  title: "Ночной вокзал",
  selected: true,
};
const FREE: CollectionPoemChoice = { id: "50000000-0000-4000-8000-000000000001", title: "Осенний сад", selected: false };
const CHOICES: readonly CollectionPoemChoice[] = [IN_COLLECTION, FREE];

const COPY = COLLECTION_POEMS_LEAVE_COPY;

stubModalDialog();

// A link click the guard lets through reaches this bubbling listener, which stops jsdom's own navigation.
const passedThrough = vi.fn();
function recordLinkClick(event: MouseEvent) {
  if (!(event.target instanceof Element) || event.target.closest("a[href]") === null) return;
  event.preventDefault();
  passedThrough();
}

beforeEach(() => {
  setConnection("online");
  // The poems page's own address, so a same-page `#` link resolves to it.
  window.history.pushState({}, "", POEMS_PATH);
  document.addEventListener("click", recordLinkClick);
});

afterEach(() => {
  document.removeEventListener("click", recordLinkClick);
  vi.resetAllMocks();
  window.history.pushState({}, "", "/");
});

function setConnection(status: ConnectionStatus) {
  vi.mocked(useConnectionStatus).mockReturnValue(status);
}

function respond(result: SaveCollectionPoemsResult): ActionResponse {
  return { data: result } as ActionResponse;
}

/** A promise the test settles by hand, to observe the dialog while the action is pending. */
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
      <a href={`${AUTHORS_PATH}?page=2#list`}>Наши авторы</a>
      <a href={`${POEMS_PATH}#top`}>Наверх</a>
      <CollectionPoemsForm collectionId={COLLECTION_ID} choices={CHOICES} />
    </Activity>
  );
}

function renderPage() {
  const user = userEvent.setup();
  const view = render(<Page />);
  return { user, rerender: (mode: "visible" | "hidden") => view.rerender(<Page mode={mode} />) };
}

const link = (name: string) => screen.getByRole("link", { name });
const box = (title: string) => screen.getByRole("checkbox", { name: title });
const button = (name: string) => screen.getByRole("button", { name });
/** The dialog's own button, where the page's save button may carry the same text. */
const dialogButton = (name: string) => within(leaveDialog()).getByRole("button", { name });
/** The page's only dialog, open or not: a closed `<dialog>` has no role or name to find it by. */
function leaveDialog(): HTMLDialogElement {
  const dialog = document.querySelector("dialog");
  if (dialog === null) throw new Error("no leave dialog rendered");
  return dialog;
}

async function changeSelection(user: UserEvent) {
  await user.click(box("Осенний сад"));
}

/** Starts a save from the page's own button; the test answers it later. */
async function startPageSave(user: UserEvent) {
  const call = deferred<ActionResponse>();
  vi.mocked(saveCollectionPoemsAction).mockReturnValueOnce(call.promise);
  await changeSelection(user);
  await user.click(button("Сохранить выбранное"));
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

describe("CollectionPoemsForm: the link form", () => {
  // implements FR-10 of add-poems-to-collections: an unchanged selection blocks nothing
  it("blocks no link and asks nothing while the selection is unchanged", async () => {
    const { user } = renderPage();

    await user.click(link("Наши авторы"));

    expect(passedThrough).toHaveBeenCalledOnce();
    expect(leaveDialog()).not.toHaveAttribute("open");
    await expect(askAsSignOut()).resolves.toBe(LEAVE_ANSWER.leave);
  });

  // implements FR-10, NFR-4 of add-poems-to-collections
  it("blocks another page's link while changed, with save focused; «Остаться» gives focus back to the link", async () => {
    const { user } = renderPage();
    await changeSelection(user);

    await user.click(link("Наши авторы"));

    expect(passedThrough).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: COPY.title })).toHaveAttribute("open");
    expect(screen.getByText(COPY.linkBody)).toBeInTheDocument();
    expect(button(COPY.save)).toHaveFocus();
    expect(button(COPY.leaveLink)).toBeInTheDocument();

    await user.click(button(COPY.stay));

    expect(leaveDialog()).not.toHaveAttribute("open");
    expect(link("Наши авторы")).toHaveFocus();
    expect(box("Осенний сад")).toBeChecked();
  });

  // implements FR-10, NFR-4 of add-poems-to-collections
  it("closes on the corner button and on Escape, focus back on the link each time", async () => {
    const { user } = renderPage();
    await changeSelection(user);

    await user.click(link("Наши авторы"));
    await user.click(button(COPY.close));
    expect(leaveDialog()).not.toHaveAttribute("open");
    expect(link("Наши авторы")).toHaveFocus();

    await user.click(link("Наши авторы"));
    pressEscape(leaveDialog());
    expect(leaveDialog()).not.toHaveAttribute("open");
    expect(link("Наши авторы")).toHaveFocus();
  });

  // implements FR-10 of add-poems-to-collections
  it("lets a same-page link through while changed", async () => {
    const { user } = renderPage();
    await changeSelection(user);

    await user.click(link("Наверх"));

    expect(passedThrough).toHaveBeenCalledOnce();
    expect(leaveDialog()).not.toHaveAttribute("open");
  });

  // implements FR-9, FR-10 of add-poems-to-collections
  it.each(["offline", "slow"] as const)("while %s, disables the dialog's save and focuses «Остаться»", async (status) => {
    const { user, rerender } = renderPage();
    await changeSelection(user);
    setConnection(status);
    rerender("visible");

    await user.click(link("Наши авторы"));

    expect(button(COPY.save)).toBeDisabled();
    expect(button(COPY.stay)).toHaveFocus();
  });

  // implements FR-10 of add-poems-to-collections
  it("leaves without saving: the link's relative path, no save sent", async () => {
    const { user } = renderPage();
    await changeSelection(user);
    await user.click(link("Наши авторы"));

    await user.click(button(COPY.leaveLink));

    expect(push).toHaveBeenCalledExactlyOnceWith(`${AUTHORS_PATH}?page=2#list`);
    expect(saveCollectionPoemsAction).not.toHaveBeenCalled();
    expect(leaveDialog()).not.toHaveAttribute("open");
  });

  // implements FR-10 of add-poems-to-collections
  it("saves, holding the dialog open while sending, then follows the link", async () => {
    const call = deferred<ActionResponse>();
    vi.mocked(saveCollectionPoemsAction).mockReturnValueOnce(call.promise);
    const { user } = renderPage();
    await changeSelection(user);
    await user.click(link("Наши авторы"));

    await user.click(button(COPY.save));

    expect(dialogButton(COPY.savePending)).toBeDisabled();
    expect(button(COPY.leaveLink)).toBeDisabled();
    expect(button(COPY.stay)).toBeDisabled();
    pressEscape(leaveDialog());
    expect(leaveDialog()).toHaveAttribute("open");

    await act(async () => call.resolve(respond({ status: "saved" })));

    expect(leaveDialog()).not.toHaveAttribute("open");
    expect(push).toHaveBeenCalledExactlyOnceWith(`${AUTHORS_PATH}?page=2#list`);
    expect(saveCollectionPoemsAction).toHaveBeenCalledExactlyOnceWith({
      collectionId: COLLECTION_ID,
      added: [FREE.id],
      removed: [],
    });
  });

  // implements FR-10 of add-poems-to-collections
  it("closes on a failed save from the dialog and shows the alert on the page, selection kept", async () => {
    vi.mocked(saveCollectionPoemsAction).mockResolvedValueOnce(respond({ status: "failed", failure: "unavailable" }));
    const { user } = renderPage();
    await changeSelection(user);
    await user.click(link("Наши авторы"));

    await user.click(button(COPY.save));

    expect(leaveDialog()).not.toHaveAttribute("open");
    expect(push).not.toHaveBeenCalled();
    // The outcome commits in its own transition, after the dialog has closed.
    expect(await screen.findByRole("alert")).toHaveTextContent(SAVE_COLLECTION_POEMS_FAILURE_MESSAGES.unavailable);
    expect(box("Осенний сад")).toBeChecked();
  });

  // implements FR-10 of add-poems-to-collections
  it("opened while the page's save is sending: waits, sends nothing more, then follows the link", async () => {
    const { user } = renderPage();
    const call = await startPageSave(user);

    await user.click(link("Наши авторы"));

    expect(leaveDialog()).toHaveAttribute("open");
    expect(dialogButton(COPY.savePending)).toBeDisabled();
    expect(button(COPY.leaveLink)).toBeDisabled();
    expect(button(COPY.stay)).toBeDisabled();
    pressEscape(leaveDialog());
    expect(leaveDialog()).toHaveAttribute("open");

    await act(async () => call.resolve(respond({ status: "saved" })));

    expect(saveCollectionPoemsAction).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledExactlyOnceWith(`${AUTHORS_PATH}?page=2#list`);
  });

  // implements FR-10 of add-poems-to-collections: off once saved
  it("blocks nothing after a saved result", async () => {
    vi.mocked(saveCollectionPoemsAction).mockResolvedValueOnce(respond({ status: "saved" }));
    const { user } = renderPage();
    await changeSelection(user);
    await user.click(button("Сохранить выбранное"));
    await screen.findByRole("status");

    await user.click(link("Наши авторы"));

    expect(passedThrough).toHaveBeenCalledOnce();
    expect(leaveDialog()).not.toHaveAttribute("open");
  });
});

describe("CollectionPoemsForm: the sign-out form", () => {
  // implements FR-10 of add-poems-to-collections
  it("asks with the sign-out text; «Остаться», the corner button, and Escape answer stay", async () => {
    const { user } = renderPage();
    await changeSelection(user);

    const byStay = askAsSignOut();
    expect(screen.getByText(COPY.signOutBody)).toBeInTheDocument();
    expect(button(COPY.leaveSignOut)).toBeInTheDocument();
    expect(button(COPY.save)).toHaveFocus();
    await user.click(button(COPY.stay));
    await expect(byStay).resolves.toBe(LEAVE_ANSWER.stay);

    const byCorner = askAsSignOut();
    await user.click(button(COPY.close));
    await expect(byCorner).resolves.toBe(LEAVE_ANSWER.stay);

    const byEscape = askAsSignOut();
    pressEscape(leaveDialog());
    await expect(byEscape).resolves.toBe(LEAVE_ANSWER.stay);
    expect(box("Осенний сад")).toBeChecked();
  });

  // implements FR-10 of add-poems-to-collections
  it("answers leave on «Выйти без сохранения» without saving", async () => {
    const { user } = renderPage();
    await changeSelection(user);

    const answer = askAsSignOut();
    await user.click(button(COPY.leaveSignOut));

    await expect(answer).resolves.toBe(LEAVE_ANSWER.leave);
    expect(saveCollectionPoemsAction).not.toHaveBeenCalled();
  });

  // implements FR-10 of add-poems-to-collections: leave is answered before the reset turns the guard off (Gate 1 C1)
  it("saves, then answers leave exactly once, although the saved result turns the guard off first", async () => {
    const call = deferred<ActionResponse>();
    vi.mocked(saveCollectionPoemsAction).mockReturnValueOnce(call.promise);
    const { user } = renderPage();
    await changeSelection(user);
    const answer = askAsSignOut();
    const settled = vi.fn();
    void answer.then(settled);

    await user.click(button(COPY.save));
    await act(async () => call.resolve(respond({ status: "saved" })));

    await expect(answer).resolves.toBe(LEAVE_ANSWER.leave);
    expect(settled).toHaveBeenCalledExactlyOnceWith(LEAVE_ANSWER.leave);
    expect(leaveDialog()).not.toHaveAttribute("open");
  });

  // implements FR-10 of add-poems-to-collections
  it("answers dismissed on a failed save and shows the alert on the page", async () => {
    vi.mocked(saveCollectionPoemsAction).mockResolvedValueOnce(respond({ status: "failed", failure: "unavailable" }));
    const { user } = renderPage();
    await changeSelection(user);
    const answer = askAsSignOut();

    await user.click(button(COPY.save));

    await expect(answer).resolves.toBe(LEAVE_ANSWER.dismissed);
    expect(leaveDialog()).not.toHaveAttribute("open");
    // The outcome commits in its own transition, after the dialog has closed.
    expect(await screen.findByRole("alert")).toHaveTextContent(SAVE_COLLECTION_POEMS_FAILURE_MESSAGES.unavailable);
  });

  // implements FR-10 of add-poems-to-collections
  it("asked while the page's save is sending: waits, and answers leave only on success", async () => {
    const { user } = renderPage();
    const call = await startPageSave(user);

    const answer = askAsSignOut();
    expect(dialogButton(COPY.savePending)).toBeDisabled();
    await act(async () => call.resolve(respond({ status: "saved" })));

    await expect(answer).resolves.toBe(LEAVE_ANSWER.leave);
    expect(saveCollectionPoemsAction).toHaveBeenCalledOnce();
  });

  // implements FR-10 of add-poems-to-collections
  it("asked while the page's save is sending: answers dismissed when it fails", async () => {
    const { user } = renderPage();
    const call = await startPageSave(user);

    const answer = askAsSignOut();
    await act(async () => call.resolve(respond({ status: "failed", failure: "unavailable" })));

    await expect(answer).resolves.toBe(LEAVE_ANSWER.dismissed);
  });
});

describe("CollectionPoemsForm: a hidden poems page", () => {
  // implements FR-10, FR-12 of add-poems-to-collections: Back/Forward hides the page; the dialog doesn't return
  it("closes the dialog and dismisses the question on hide, and keeps the draft when visible again", async () => {
    const { user, rerender } = renderPage();
    await changeSelection(user);
    const answer = askAsSignOut();

    rerender("hidden");
    await expect(answer).resolves.toBe(LEAVE_ANSWER.dismissed);
    rerender("visible");

    expect(leaveDialog()).not.toHaveAttribute("open");
    expect(box("Осенний сад")).toBeChecked();
  });
});
