import { act, render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type ConnectionStatus, useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";

import { moveCollectionAction } from "../../actions/move-collection.actions";
import { movePoemAction } from "../../actions/move-poem.actions";
import { WorkBoardIsland } from "../../components/WorkBoardIsland/WorkBoardIsland";
import type { Arrangement, MoveResult } from "../../model/work-ordering.types";
import { BOARD } from "../model/board-fixtures";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("../../actions/move-poem.actions", () => ({ movePoemAction: vi.fn() }));
vi.mock("../../actions/move-collection.actions", () => ({ moveCollectionAction: vi.fn() }));
vi.mock("@/shared/lib/network/use-connection-status", () => ({ useConnectionStatus: vi.fn() }));

type PoemResponse = Awaited<ReturnType<typeof movePoemAction>>;
type CollectionResponse = Awaited<ReturnType<typeof moveCollectionAction>>;

const FAILED_TEXT = "Не удалось сохранить порядок. Попробуйте ещё раз.";
const RATE_LIMITED_TEXT = "Слишком много перестановок за минуту. Подождите немного и повторите.";
const STALE_TEXT = "Список изменился в другой вкладке. Мы обновили его — попробуйте ещё раз.";
const EMPTY_COLLECTION_AREA = "Перетащите сюда произведение.";
const EMPTY_FREE_AREA = "Перетащите сюда произведение, чтобы оно не входило ни в один сборник.";
const OFFLINE_TEXT = "Нет подключения к интернету. Сохранение станет доступно, когда связь восстановится.";

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
  useSessionExpiredNotice.getState().clearSessionExpired();
});

function poemAnswer(result: MoveResult): PoemResponse {
  return { data: result } as PoemResponse;
}

function collectionAnswer(result: MoveResult): CollectionResponse {
  return { data: result } as CollectionResponse;
}

/** A promise the test settles by hand, to look at the board while the move is still sending. */
function deferred<T>(): { readonly promise: Promise<T>; readonly resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

const poemHandle = (title: string) => screen.getByRole("button", { name: `Переместить произведение «${title}»` });
const collectionHandle = (title: string) => screen.getByRole("button", { name: `Переместить сборник «${title}»` });
const liveRegion = () => document.querySelector<HTMLElement>('[aria-live="polite"]');

/** The titles of the links inside one list, in order. */
function titlesIn(list: HTMLElement): string[] {
  return within(list)
    .getAllByRole("link")
    .map((link) => link.textContent ?? "");
}

function collectionList(title: string): HTMLElement {
  const item = screen.getByRole("link", { name: title }).closest("li");
  const list = item?.querySelector("ul");
  if (!list) throw new Error(`no list under ${title}`);
  return list;
}

/** The library attaches its keydown listener one tick after Space, so the first arrow would be lost without this. */
async function tick() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function lift(user: UserEvent, handle: HTMLElement) {
  handle.focus();
  await user.keyboard(" ");
  await tick();
}

async function press(user: UserEvent, key: string, times = 1) {
  for (let step = 0; step < times; step += 1) {
    await user.keyboard(`{${key}}`);
  }
}

function renderBoard(arrangement: Arrangement = BOARD) {
  return render(<WorkBoardIsland arrangement={arrangement} />);
}

describe("WorkBoardIsland structure", () => {
  // implements NFR-4 of drag-and-drop-ordering
  it("renders collections as items of one list with their poems in a nested list", () => {
    renderBoard();

    const items = screen.getAllByRole("listitem").filter((item) => item.closest("ul")?.closest("li") === null);
    expect(within(items[0] as HTMLElement).getByRole("link", { name: "Осень" })).toBeInTheDocument();
    expect(titlesIn(collectionList("Осень"))).toEqual(["А", "Б", "В"]);
    expect(titlesIn(collectionList("Зима"))).toEqual(["Г"]);
  });

  // implements NFR-4, FR-7 of drag-and-drop-ordering
  it("gives every item a button handle named for its title, and keeps each title a link", () => {
    renderBoard();

    expect(collectionHandle("Осень")).toBeInstanceOf(HTMLButtonElement);
    expect(poemHandle("А")).toBeInstanceOf(HTMLButtonElement);
    expect(screen.getByRole("link", { name: "А" })).toHaveAttribute("href", "/account/poems/a");
    expect(screen.getByRole("link", { name: "Осень" })).toHaveAttribute("href", "/account/poems/collections/autumn");
  });

  // implements NFR-4 of drag-and-drop-ordering
  it("has the section heading, and its own polite live region", () => {
    renderBoard();

    expect(screen.getByRole("heading", { level: 2, name: "Сборники произведений" })).toBeInTheDocument();
    expect(liveRegion()).toHaveAttribute("role", "status");
  });

  it("shows no section heading when there are no collections", () => {
    renderBoard({ collections: [], freePoems: [{ id: "e", title: "Д" }] });

    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    expect(poemHandle("Д")).toBeInTheDocument();
  });

  // implements FR-7 of drag-and-drop-ordering: handle-only drag props
  it("starts a drag from the handle only: the title and the row carry no drag listeners", () => {
    renderBoard();

    expect(poemHandle("А")).toHaveAttribute("aria-describedby");
    expect(screen.getByRole("link", { name: "А" })).not.toHaveAttribute("aria-describedby");
    expect(screen.getByRole("link", { name: "А" }).closest("li")).not.toHaveAttribute("aria-describedby");
  });
});

describe("WorkBoardIsland keyboard", () => {
  // implements FR-7, FR-2 of drag-and-drop-ordering
  it("moves a poem up inside its list, announces each step, and stores the drop", async () => {
    const user = userEvent.setup();
    const answer = deferred<PoemResponse>();
    vi.mocked(movePoemAction).mockReturnValue(answer.promise);
    renderBoard();

    await lift(user, poemHandle("В"));
    expect(liveRegion()).toHaveTextContent("Взято: «В».");

    await press(user, "ArrowUp", 2);
    expect(liveRegion()).toHaveTextContent("«В» — позиция 1 из 3.");
    expect(titlesIn(collectionList("Осень"))).toEqual(["В", "А", "Б"]);

    await press(user, " ");
    expect(movePoemAction).toHaveBeenCalledExactlyOnceWith({
      poemId: "c",
      from: { kind: "collection", collectionId: "autumn" },
      to: { kind: "collection", collectionId: "autumn" },
      toIndex: 0,
    });
    // implements FR-6: the dropped place shows while the move is sending, and every handle is disabled.
    expect(titlesIn(collectionList("Осень"))).toEqual(["В", "А", "Б"]);
    expect(poemHandle("А")).toBeDisabled();

    await act(async () => answer.resolve(poemAnswer({ ok: true })));
    // The mock never refreshes the props, so the stored arrangement is the old one again.
    expect(poemHandle("А")).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // implements FR-7: focus is back on the moved item's handle.
    expect(poemHandle("В")).toHaveFocus();
  });

  // implements FR-7 of drag-and-drop-ordering
  it("cancels with Escape: the old order, nothing stored, the cancel announced, focus on the handle", async () => {
    const user = userEvent.setup();
    renderBoard();

    await lift(user, poemHandle("В"));
    await press(user, "ArrowUp");
    await press(user, "Escape");

    expect(titlesIn(collectionList("Осень"))).toEqual(["А", "Б", "В"]);
    expect(movePoemAction).not.toHaveBeenCalled();
    expect(liveRegion()).toHaveTextContent("«В» возвращено на прежнее место.");
    expect(poemHandle("В")).toHaveFocus();
  });

  // implements FR-7, FR-3 of drag-and-drop-ordering
  it("moves a poem into the next collection with the «помещено в» phrase, then drops it there", async () => {
    const user = userEvent.setup();
    vi.mocked(movePoemAction).mockResolvedValue(poemAnswer({ ok: true }));
    renderBoard();

    await lift(user, poemHandle("В"));
    await press(user, "ArrowDown");

    expect(liveRegion()).toHaveTextContent("«В» помещено в сборник «Зима», позиция 1 из 2.");
    expect(titlesIn(collectionList("Зима"))).toEqual(["В", "Г"]);
    expect(titlesIn(collectionList("Осень"))).toEqual(["А", "Б"]);

    await press(user, " ");
    expect(movePoemAction).toHaveBeenCalledExactlyOnceWith({
      poemId: "c",
      from: { kind: "collection", collectionId: "autumn" },
      to: { kind: "collection", collectionId: "winter" },
      toIndex: 0,
    });
  });

  // implements FR-7, FR-3 of drag-and-drop-ordering
  it("reaches an empty collection and then the free poems with the keyboard alone", async () => {
    const user = userEvent.setup();
    renderBoard();

    await lift(user, poemHandle("Г"));
    await press(user, "ArrowDown");
    expect(liveRegion()).toHaveTextContent("«Г» помещено в сборник «Пустой», позиция 1 из 1.");

    await press(user, "ArrowDown");
    expect(liveRegion()).toHaveTextContent("«Г» помещено в свободные, позиция 1 из 3.");
  });

  // implements FR-7 of drag-and-drop-ordering
  it("does nothing, silently, at the first place of the board and for ArrowLeft and ArrowRight", async () => {
    const user = userEvent.setup();
    renderBoard();

    await lift(user, poemHandle("А"));
    await press(user, "ArrowUp");
    await press(user, "ArrowLeft");
    await press(user, "ArrowRight");

    expect(liveRegion()).toHaveTextContent("Взято: «А».");
    expect(titlesIn(collectionList("Осень"))).toEqual(["А", "Б", "В"]);
  });

  // implements FR-7 of drag-and-drop-ordering
  it("does not lift with Enter", async () => {
    const user = userEvent.setup();
    renderBoard();

    poemHandle("А").focus();
    await user.keyboard("{Enter}");
    await tick();

    expect(liveRegion()).toHaveTextContent("");
  });

  // implements FR-2 of drag-and-drop-ordering
  it("sends nothing for a drop on the item's own place, and focus stays on the handle", async () => {
    const user = userEvent.setup();
    renderBoard();

    await lift(user, poemHandle("Б"));
    await press(user, " ");

    expect(movePoemAction).not.toHaveBeenCalled();
    expect(liveRegion()).toHaveTextContent("«Б» — позиция 2 из 3.");
    expect(poemHandle("Б")).toHaveFocus();
  });

  // implements FR-5, FR-7 of drag-and-drop-ordering
  it("moves a collection among the collections only and stores it", async () => {
    const user = userEvent.setup();
    vi.mocked(moveCollectionAction).mockResolvedValue(collectionAnswer({ ok: true }));
    renderBoard();

    await lift(user, collectionHandle("Осень"));
    await press(user, "ArrowDown");

    expect(liveRegion()).toHaveTextContent("«Осень» — позиция 2 из 3.");
    expect(titlesIn(collectionList("Осень"))).toEqual(["А", "Б", "В"]);

    await press(user, " ");
    expect(moveCollectionAction).toHaveBeenCalledExactlyOnceWith({ collectionId: "autumn", toIndex: 1 });
    expect(movePoemAction).not.toHaveBeenCalled();
  });

  // implements NFR-4 of drag-and-drop-ordering: the library's own region stays silent
  it("writes each event once: the library's assertive live region holds no text", async () => {
    const user = userEvent.setup();
    renderBoard();

    await lift(user, poemHandle("В"));
    await press(user, "ArrowUp");

    const assertive = [...document.querySelectorAll('[aria-live="assertive"]')];
    expect(assertive.map((region) => region.textContent)).toEqual(assertive.map(() => ""));
  });
});

describe("WorkBoardIsland drop areas", () => {
  // implements FR-3, FR-4 of drag-and-drop-ordering
  it("shows an empty collection's drop area only while a poem is held", async () => {
    const user = userEvent.setup();
    renderBoard();
    expect(screen.queryByText(EMPTY_COLLECTION_AREA)).not.toBeInTheDocument();

    await lift(user, collectionHandle("Осень"));
    expect(screen.queryByText(EMPTY_COLLECTION_AREA)).not.toBeInTheDocument();
    await press(user, "Escape");

    await lift(user, poemHandle("А"));
    expect(screen.getByText(EMPTY_COLLECTION_AREA)).toBeInTheDocument();
  });

  // implements FR-4 of drag-and-drop-ordering
  it("shows the free poems' drop area while a poem is held and none exists, never for a collection", async () => {
    const user = userEvent.setup();
    renderBoard({ collections: BOARD.collections, freePoems: [] });
    expect(screen.queryByText(EMPTY_FREE_AREA)).not.toBeInTheDocument();

    await lift(user, collectionHandle("Осень"));
    expect(screen.queryByText(EMPTY_FREE_AREA)).not.toBeInTheDocument();
    await press(user, "Escape");

    await lift(user, poemHandle("А"));
    expect(screen.getByText(EMPTY_FREE_AREA)).toBeInTheDocument();
  });
});

describe("WorkBoardIsland answers", () => {
  async function dropOnce(user: UserEvent) {
    await lift(user, poemHandle("В"));
    await press(user, "ArrowUp");
    await press(user, " ");
  }

  // implements FR-6, FR-11 of drag-and-drop-ordering
  it.each([
    ["failed", FAILED_TEXT],
    ["rate-limited", RATE_LIMITED_TEXT],
    ["stale", STALE_TEXT],
  ] as const)("returns the item and focuses the alert after a %s move", async (reason, text) => {
    const user = userEvent.setup();
    const answer = deferred<PoemResponse>();
    vi.mocked(movePoemAction).mockReturnValue(answer.promise);
    renderBoard();

    await dropOnce(user);
    expect(titlesIn(collectionList("Осень"))).toEqual(["А", "В", "Б"]);
    await act(async () => answer.resolve(poemAnswer({ ok: false, reason })));

    expect(titlesIn(collectionList("Осень"))).toEqual(["А", "Б", "В"]);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(text);
    expect(alert.parentElement).toHaveFocus();
    expect(poemHandle("А")).toBeEnabled();
  });

  // implements FR-6 of drag-and-drop-ordering: a dropped connection is the same alert, never the error screen
  it("shows the failed alert when the call throws", async () => {
    const user = userEvent.setup();
    vi.mocked(movePoemAction).mockRejectedValue(new TypeError("Failed to fetch"));
    renderBoard();

    await dropOnce(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(FAILED_TEXT);
    expect(console.error).toHaveBeenCalledWith("[work-ordering] move call rejected: TypeError");
  });

  it("shows the failed alert when the action answers with no data", async () => {
    const user = userEvent.setup();
    vi.mocked(movePoemAction).mockResolvedValue({} as PoemResponse);
    renderBoard();

    await dropOnce(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(FAILED_TEXT);
  });

  // implements FR-6 of drag-and-drop-ordering
  it("sends an expired session to /login with the session-expired marker", async () => {
    const user = userEvent.setup();
    vi.mocked(movePoemAction).mockResolvedValue(poemAnswer({ ok: false, reason: "unauthenticated" }));
    renderBoard();

    await dropOnce(user);

    await act(async () => undefined);
    expect(replace).toHaveBeenCalledExactlyOnceWith("/login");
    expect(refresh).toHaveBeenCalledOnce();
    expect(useSessionExpiredNotice.getState().expired).toBe(true);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // implements FR-6 of drag-and-drop-ordering
  it("hides the previous alert when the next move starts", async () => {
    const user = userEvent.setup();
    vi.mocked(movePoemAction).mockResolvedValueOnce(poemAnswer({ ok: false, reason: "failed" }));
    renderBoard();
    await dropOnce(user);
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    const second = deferred<PoemResponse>();
    vi.mocked(movePoemAction).mockReturnValue(second.promise);
    await dropOnce(user);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await act(async () => second.resolve(poemAnswer({ ok: true })));
  });
});

describe("WorkBoardIsland connection", () => {
  // implements FR-6 of drag-and-drop-ordering
  it.each([
    ["offline", true],
    ["slow", true],
    ["online", false],
  ] as const)("while %s, handles are disabled: %s", (status, disabled) => {
    setConnection(status);
    renderBoard();

    if (disabled) expect(poemHandle("А")).toBeDisabled();
    else expect(poemHandle("А")).toBeEnabled();
  });

  // implements FR-6 of drag-and-drop-ordering
  it("shows the existing offline notice above the board", () => {
    setConnection("offline");
    renderBoard();

    expect(screen.getByText(OFFLINE_TEXT)).toHaveAttribute("role", "status");
  });

  // implements FR-6 of drag-and-drop-ordering: a drag in progress is not cancelled
  it("lets a drag that started online be dropped after the connection drops", async () => {
    const user = userEvent.setup();
    vi.mocked(movePoemAction).mockResolvedValue(poemAnswer({ ok: true }));
    const view = renderBoard();

    await lift(user, poemHandle("В"));
    await press(user, "ArrowUp");
    setConnection("offline");
    view.rerender(<WorkBoardIsland arrangement={BOARD} />);
    expect(poemHandle("В")).toBeDisabled();

    await press(user, " ");

    expect(movePoemAction).toHaveBeenCalledOnce();
  });
});
