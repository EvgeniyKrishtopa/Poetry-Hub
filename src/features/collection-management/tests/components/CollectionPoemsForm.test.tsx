import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type ConnectionStatus, useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";
import { stubModalDialog } from "@/shared/ui/tests/stub-modal-dialog";

import { saveCollectionPoemsAction } from "../../actions/save-collection-poems.actions";
import { CollectionPoemsForm } from "../../components/CollectionPoemsForm/CollectionPoemsForm";
import { useCollectionListNotice } from "../../model/collection-list-notice-ui.store";
import {
  COLLECTION_POEMS_PAGE_COPY,
  SAVE_COLLECTION_POEMS_FAILURE_MESSAGES,
} from "../../model/collection-management-messages";
import type { CollectionPoemChoice, SaveCollectionPoemsResult } from "../../model/collection-management.types";

const push = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace, refresh }) }));
vi.mock("../../actions/save-collection-poems.actions", () => ({ saveCollectionPoemsAction: vi.fn() }));
vi.mock("@/shared/lib/network/use-connection-status", () => ({ useConnectionStatus: vi.fn() }));

type ActionResponse = Awaited<ReturnType<typeof saveCollectionPoemsAction>>;

const COLLECTION_ID = "40000000-0000-4000-8000-000000000031";
const IN_COLLECTION: CollectionPoemChoice = {
  id: "50000000-0000-4000-8000-000000000002",
  title: "Ночной вокзал",
  selected: true,
};
const FREE: CollectionPoemChoice = { id: "50000000-0000-4000-8000-000000000001", title: "Осенний сад", selected: false };
const OTHER_FREE: CollectionPoemChoice = {
  id: "50000000-0000-4000-8000-000000000003",
  title: "Первый снег",
  selected: false,
};
const CHOICES: readonly CollectionPoemChoice[] = [IN_COLLECTION, FREE, OTHER_FREE];

const OFFLINE_TEXT = "Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.";
const SLOW_TEXT = "Медленное подключение к интернету. Сохранение станет доступно, когда связь улучшится.";

stubModalDialog();

function respond(result: SaveCollectionPoemsResult): ActionResponse {
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

function setConnection(status: ConnectionStatus) {
  vi.mocked(useConnectionStatus).mockReturnValue(status);
}

function renderForm(choices: readonly CollectionPoemChoice[] = CHOICES) {
  const user = userEvent.setup();
  const view = render(<CollectionPoemsForm collectionId={COLLECTION_ID} choices={choices} />);
  /** The props a `refresh()` brings: the stored selection as the server now has it. */
  const refreshWith = (next: readonly CollectionPoemChoice[]) =>
    view.rerender(<CollectionPoemsForm collectionId={COLLECTION_ID} choices={next} />);
  return { user, refreshWith };
}

const box = (title: string) => screen.getByRole("checkbox", { name: title });
const boxes = () => screen.getAllByRole("checkbox");
const saveButton = () => screen.getByRole("button", { name: /^Сохран/ });
const querySaveButton = () => screen.queryByRole("button", { name: /^Сохран/ });
const queryBackLink = () => screen.queryByRole("link", { name: COLLECTION_POEMS_PAGE_COPY.backToCollection });
/** The page's own notices with this text; the closed leave dialog repeats the connection notice. */
const pageTexts = (text: string) =>
  screen.queryAllByText(text).filter((element) => element.closest("dialog") === null);

beforeEach(() => {
  setConnection("online");
});

afterEach(() => {
  vi.resetAllMocks();
  useCollectionListNotice.getState().clearListNotice();
  useSessionExpiredNotice.getState().clearSessionExpired();
});

describe("CollectionPoemsForm: the list", () => {
  // implements FR-4, NFR-4 of add-poems-to-collections
  it("lists the choices in order, checked as stored, in a fieldset named «Произведения», with no save button", () => {
    renderForm();

    const group = screen.getByRole("group", { name: COLLECTION_POEMS_PAGE_COPY.legend });
    expect(group.tagName).toBe("FIELDSET");
    expect(boxes().map((input) => input.closest("label")?.textContent)).toEqual([
      "Ночной вокзал",
      "Осенний сад",
      "Первый снег",
    ]);
    expect(box("Ночной вокзал")).toBeChecked();
    expect(box("Осенний сад")).not.toBeChecked();
    expect(querySaveButton()).toBeNull();
    expect(queryBackLink()).toBeNull();
  });

  // implements FR-4 of add-poems-to-collections
  it("shows the nothing-to-manage text and the back link to the collection when there are no choices", () => {
    renderForm([]);

    expect(screen.getByText(COLLECTION_POEMS_PAGE_COPY.empty)).toBeInTheDocument();
    expect(queryBackLink()).toHaveAttribute("href", `/account/poems/collections/${COLLECTION_ID}`);
    expect(screen.queryAllByRole("checkbox")).toEqual([]);
  });
});

describe("CollectionPoemsForm: change detection", () => {
  // implements FR-5 of add-poems-to-collections
  it("shows an enabled save button once a free poem is checked", async () => {
    const { user } = renderForm();

    await user.click(box("Осенний сад"));

    expect(box("Осенний сад")).toBeChecked();
    expect(saveButton()).toBeEnabled();
  });

  // implements FR-5 of add-poems-to-collections
  it("shows the save button once a stored poem is unchecked", async () => {
    const { user } = renderForm();

    await user.click(box("Ночной вокзал"));

    expect(saveButton()).toBeEnabled();
  });

  // implements FR-5 of add-poems-to-collections
  it("hides the save button again when the selection returns to what is stored", async () => {
    const { user } = renderForm();

    await user.click(box("Осенний сад"));
    await user.click(box("Осенний сад"));

    expect(querySaveButton()).toBeNull();
  });

  // implements NFR-4 of add-poems-to-collections
  it("toggles a box with Space", async () => {
    const { user } = renderForm();

    box("Осенний сад").focus();
    await user.keyboard(" ");

    expect(box("Осенний сад")).toBeChecked();
  });
});

describe("CollectionPoemsForm: saving", () => {
  // implements FR-6 of add-poems-to-collections
  it("sends the added and removed poems only", async () => {
    vi.mocked(saveCollectionPoemsAction).mockResolvedValue(respond({ status: "saved" }));
    const { user } = renderForm();

    await user.click(box("Осенний сад"));
    await user.click(box("Ночной вокзал"));
    await user.click(saveButton());

    expect(saveCollectionPoemsAction).toHaveBeenCalledExactlyOnceWith({
      collectionId: COLLECTION_ID,
      added: [FREE.id],
      removed: [IN_COLLECTION.id],
    });
  });

  // implements FR-6 of add-poems-to-collections
  it("while sending: «Сохранение…», every box disabled, and a second click sends nothing", async () => {
    const call = deferred<ActionResponse>();
    vi.mocked(saveCollectionPoemsAction).mockReturnValue(call.promise);
    const { user } = renderForm();

    await user.click(box("Осенний сад"));
    await user.click(saveButton());
    await user.click(saveButton());

    expect(saveButton()).toHaveTextContent(COLLECTION_POEMS_PAGE_COPY.savePending);
    expect(saveButton()).toBeDisabled();
    for (const input of boxes()) expect(input).toBeDisabled();
    expect(saveCollectionPoemsAction).toHaveBeenCalledOnce();

    await act(async () => call.resolve(respond({ status: "saved" })));
  });

  // implements FR-6 of add-poems-to-collections
  it("on saved: the notice, a disabled button, the back link, and the boxes following the refreshed stored set", async () => {
    vi.mocked(saveCollectionPoemsAction).mockResolvedValue(respond({ status: "saved" }));
    const { user, refreshWith } = renderForm();

    await user.click(box("Осенний сад"));
    await user.click(saveButton());
    refreshWith([IN_COLLECTION, { ...FREE, selected: true }, OTHER_FREE]);

    expect(screen.getByRole("status")).toHaveTextContent(COLLECTION_POEMS_PAGE_COPY.saved);
    expect(saveButton()).toHaveTextContent(COLLECTION_POEMS_PAGE_COPY.save);
    expect(saveButton()).toBeDisabled();
    expect(queryBackLink()).toHaveAttribute("href", `/account/poems/collections/${COLLECTION_ID}`);
    expect(box("Осенний сад")).toBeChecked();
    expect(box("Ночной вокзал")).toBeChecked();
    expect(box("Первый снег")).not.toBeChecked();
  });

  // implements FR-6 of add-poems-to-collections
  it("drops the draft on saved, so the boxes show the stored set the refresh brings, not the draft", async () => {
    vi.mocked(saveCollectionPoemsAction).mockResolvedValue(respond({ status: "saved" }));
    const { user, refreshWith } = renderForm();

    await user.click(box("Осенний сад"));
    await user.click(saveButton());
    // Another tab took a different poem meanwhile: the stored set wins over what was checked here.
    refreshWith([IN_COLLECTION, FREE, { ...OTHER_FREE, selected: true }]);

    expect(box("Осенний сад")).not.toBeChecked();
    expect(box("Первый снег")).toBeChecked();
  });

  // implements FR-6 of add-poems-to-collections
  it("hides the notice and the link and enables the button on the next change after a save", async () => {
    vi.mocked(saveCollectionPoemsAction).mockResolvedValue(respond({ status: "saved" }));
    const { user, refreshWith } = renderForm();
    await user.click(box("Осенний сад"));
    await user.click(saveButton());
    refreshWith([IN_COLLECTION, { ...FREE, selected: true }, OTHER_FREE]);

    await user.click(box("Первый снег"));

    expect(screen.queryByRole("status")).toBeNull();
    expect(queryBackLink()).toBeNull();
    expect(saveButton()).toBeEnabled();

    // Back to the stored set: the disabled button and the link return, the notice doesn't.
    await user.click(box("Первый снег"));
    expect(saveButton()).toBeDisabled();
    expect(queryBackLink()).not.toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  // implements FR-8, NFR-4 of add-poems-to-collections
  it("on stale: the stale alert above the list, focused, and the boxes following the refreshed stored set", async () => {
    vi.mocked(saveCollectionPoemsAction).mockResolvedValue(respond({ status: "stale" }));
    const { user, refreshWith } = renderForm();

    await user.click(box("Осенний сад"));
    await user.click(saveButton());
    // The poem was taken by another collection meanwhile: gone from the refreshed list.
    refreshWith([IN_COLLECTION, OTHER_FREE]);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(COLLECTION_POEMS_PAGE_COPY.stale);
    expect(alert.parentElement).toHaveFocus();
    expect(alert.compareDocumentPosition(box("Ночной вокзал")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: "Осенний сад" })).toBeNull();
    expect(box("Ночной вокзал")).toBeChecked();
    expect(querySaveButton()).toBeNull();
  });

  // implements FR-8 of add-poems-to-collections
  it("keeps the stale alert above the nothing-to-manage text when the refresh empties the list", async () => {
    vi.mocked(saveCollectionPoemsAction).mockResolvedValue(respond({ status: "stale" }));
    const { user, refreshWith } = renderForm([FREE]);

    await user.click(box("Осенний сад"));
    await user.click(saveButton());
    refreshWith([]);

    const alert = screen.getByRole("alert");
    const empty = screen.getByText(COLLECTION_POEMS_PAGE_COPY.empty);
    expect(alert).toHaveTextContent(COLLECTION_POEMS_PAGE_COPY.stale);
    expect(alert.compareDocumentPosition(empty) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(queryBackLink()).not.toBeNull();
  });

  // implements FR-8 of add-poems-to-collections
  it("on a collection gone meanwhile, stores the already-deleted notice and replaces the page with the list", async () => {
    vi.mocked(saveCollectionPoemsAction).mockResolvedValue(respond({ status: "not-found" }));
    const { user } = renderForm();

    await user.click(box("Осенний сад"));
    await user.click(saveButton());

    expect(useCollectionListNotice.getState().notice).toEqual({ kind: "already-deleted" });
    expect(replace).toHaveBeenCalledExactlyOnceWith("/account/poems");
  });

  // implements FR-8 of add-poems-to-collections
  it("on an expired session, marks it and goes to sign-in", async () => {
    vi.mocked(saveCollectionPoemsAction).mockResolvedValue(respond({ status: "failed", failure: "unauthenticated" }));
    const { user } = renderForm();

    await user.click(box("Осенний сад"));
    await user.click(saveButton());

    expect(useSessionExpiredNotice.getState().expired).toBe(true);
    expect(replace).toHaveBeenCalledExactlyOnceWith("/login");
    expect(refresh).toHaveBeenCalledOnce();
  });

  // implements FR-7, FR-8, NFR-4 of add-poems-to-collections
  // implements FR-15 of admin-moderation: `restricted` keeps the selection and shows its own message
  it.each(["too-many-saves", "not-public", "unavailable", "unknown", "restricted"] as const)(
    "on %s: the alert above the list, focused, the selection kept and the button enabled",
    async (failure) => {
      vi.mocked(saveCollectionPoemsAction).mockResolvedValue(respond({ status: "failed", failure }));
      const { user } = renderForm();

      await user.click(box("Осенний сад"));
      await user.click(saveButton());

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(SAVE_COLLECTION_POEMS_FAILURE_MESSAGES[failure]);
      expect(alert.parentElement).toHaveFocus();
      expect(box("Осенний сад")).toBeChecked();
      expect(saveButton()).toBeEnabled();
    },
  );

  // implements FR-8 of add-poems-to-collections
  it("shows the unknown alert for an answer without data", async () => {
    vi.mocked(saveCollectionPoemsAction).mockResolvedValue({ serverError: "x" } as ActionResponse);
    const { user } = renderForm();

    await user.click(box("Осенний сад"));
    await user.click(saveButton());

    expect(screen.getByRole("alert")).toHaveTextContent(SAVE_COLLECTION_POEMS_FAILURE_MESSAGES.unknown);
  });

  // implements FR-8 of add-poems-to-collections
  it("shows the unknown alert for a call rejected while online, and hides it on the next save", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const next = deferred<ActionResponse>();
    vi.mocked(saveCollectionPoemsAction).mockRejectedValueOnce(new TypeError("Failed to fetch")).mockReturnValueOnce(next.promise);
    const { user } = renderForm();

    await user.click(box("Осенний сад"));
    await user.click(saveButton());
    expect(screen.getByRole("alert")).toHaveTextContent(SAVE_COLLECTION_POEMS_FAILURE_MESSAGES.unknown);
    expect(box("Осенний сад")).toBeChecked();

    await user.click(saveButton());
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => next.resolve(respond({ status: "saved" })));
  });

  // implements FR-12 of add-poems-to-collections
  it("keeps an unsaved draft over a refreshed list: a vanished poem has no box, the rest stays checked", async () => {
    const { user, refreshWith } = renderForm();

    await user.click(box("Осенний сад"));
    await user.click(box("Первый снег"));
    refreshWith([IN_COLLECTION, OTHER_FREE]);

    expect(screen.queryByRole("checkbox", { name: "Осенний сад" })).toBeNull();
    expect(box("Первый снег")).toBeChecked();
    expect(saveButton()).toBeEnabled();
  });

  // implements FR-12 of add-poems-to-collections
  it("counts a draft whose only change vanished as unchanged", async () => {
    const { user, refreshWith } = renderForm();

    await user.click(box("Осенний сад"));
    refreshWith([IN_COLLECTION, OTHER_FREE]);

    expect(querySaveButton()).toBeNull();
  });
});

describe("CollectionPoemsForm: connection", () => {
  // implements FR-9 of add-poems-to-collections
  it.each([
    ["offline", OFFLINE_TEXT],
    ["slow", SLOW_TEXT],
  ] as const)("while %s, shows the notice and freezes every box and the button, keeping the draft", async (status, text) => {
    const { user, refreshWith } = renderForm();
    await user.click(box("Осенний сад"));

    setConnection(status);
    refreshWith(CHOICES);

    expect(pageTexts(text)).toHaveLength(1);
    for (const input of boxes()) expect(input).toBeDisabled();
    expect(saveButton()).toBeDisabled();
    expect(box("Осенний сад")).toBeChecked();

    setConnection("online");
    refreshWith(CHOICES);

    expect(pageTexts(text)).toEqual([]);
    for (const input of boxes()) expect(input).toBeEnabled();
    expect(saveButton()).toBeEnabled();
  });

  // implements FR-9 of add-poems-to-collections
  it("shows no alert for a call rejected after the connection dropped, keeping the draft", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const call = deferred<ActionResponse>();
    vi.mocked(saveCollectionPoemsAction).mockReturnValue(call.promise);
    const { user, refreshWith } = renderForm();
    await user.click(box("Осенний сад"));
    await user.click(saveButton());

    setConnection("offline");
    refreshWith(CHOICES);
    await act(async () => call.reject(new TypeError("Failed to fetch")));

    expect(screen.queryByRole("alert")).toBeNull();
    expect(pageTexts(OFFLINE_TEXT)).toHaveLength(1);
    expect(box("Осенний сад")).toBeChecked();
  });
});
