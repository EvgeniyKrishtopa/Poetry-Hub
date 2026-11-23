import { KeyboardSensor, MouseSensor, TouchSensor } from "@dnd-kit/core";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { moveHomeEntryAction } from "../../actions/move-home-entry.actions";
import { removeHomeEntryAction } from "../../actions/remove-home-entry.actions";
import { HomeEntryList } from "../../components/HomeEntryList/HomeEntryList";
import { ADD_TO_HOME_COPY, ADMIN_HOME_PAGE_COPY } from "../../model/admin-messages";
import type { HomeEntry, HomeEntryKind } from "../../model/home-entry.types";

interface CapturedDnd {
  onDragEnd: ((event: unknown) => void) | null;
  sensors: readonly { sensor: unknown }[];
  announcements: Record<string, (event: unknown) => string | undefined> | null;
}
const dnd = vi.hoisted((): CapturedDnd => ({ onDragEnd: null, sensors: [], announcements: null }));
vi.mock("@dnd-kit/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@dnd-kit/core")>()),
  DndContext: (props: {
    children: ReactNode;
    onDragEnd: (event: unknown) => void;
    sensors: readonly { sensor: unknown }[];
    accessibility: { announcements: CapturedDnd["announcements"] };
  }) => {
    dnd.onDragEnd = props.onDragEnd;
    dnd.sensors = props.sensors;
    dnd.announcements = props.accessibility.announcements;
    return <>{props.children}</>;
  },
}));
vi.mock("@dnd-kit/sortable", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@dnd-kit/sortable")>()),
  SortableContext: ({ children }: { children: ReactNode }) => <>{children}</>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => undefined,
    setActivatorNodeRef: () => undefined,
    transform: null,
    isDragging: false,
  }),
}));
vi.mock("../../actions/move-home-entry.actions", () => ({ moveHomeEntryAction: vi.fn() }));
vi.mock("../../actions/remove-home-entry.actions", () => ({ removeHomeEntryAction: vi.fn() }));
const connection = vi.hoisted(() => ({ status: "online" as "online" | "offline" }));
vi.mock("@/shared/lib/network/use-connection", () => ({
  useConnection: () => ({ status: connection.status, isOnline: connection.status === "online" }),
}));

beforeEach(() => {
  connection.status = "online";
});
afterEach(() => vi.clearAllMocks());

function entry(kind: HomeEntryKind, position: number, label: string, shown = true): HomeEntry {
  return { kind, id: `${kind}-${position}`, position, shown, label, authorName: kind === "poem" ? "Анна Лис" : null };
}

const POEMS = [entry("poem", 1, "Осень"), entry("poem", 2, "Зима"), entry("poem", 3, "Весна")];

type MoveResponse = Awaited<ReturnType<typeof moveHomeEntryAction>>;
type RemoveResponse = Awaited<ReturnType<typeof removeHomeEntryAction>>;
const moved = (status: "moved" | "stale" | "not-found"): MoveResponse =>
  ({ data: { ok: true, status } }) as MoveResponse;
const removed = (status: "removed" | "not-found"): RemoveResponse =>
  ({ data: { ok: true, status } }) as RemoveResponse;

function renderPoems(entries: readonly HomeEntry[] = POEMS) {
  return render(<HomeEntryList kind="poem" entries={entries} />);
}

const labelsInOrder = () =>
  screen.getAllByRole("listitem").map((item) => within(item).getByText(/^(Осень|Зима|Весна)$/).textContent);

/** What dnd-kit hands `onDragEnd` when `activeId` is dropped on `overId` (or on nothing). */
function drop(activeId: string, overId: string | null) {
  act(() => dnd.onDragEnd?.({ active: { id: activeId }, over: overId === null ? null : { id: overId } }));
}

describe("HomeEntryList", () => {
  // implements FR-9 of home-page-sections
  it("shows the entries in the order given, each with its poem's author", () => {
    renderPoems();

    expect(labelsInOrder()).toEqual(["Осень", "Зима", "Весна"]);
    expect(screen.getAllByText("Анна Лис")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: ADMIN_HOME_PAGE_COPY.headings.poem })).toBeInTheDocument();
  });

  // implements FR-9 of home-page-sections
  it("shows the empty text for its kind and no list when nothing is chosen", () => {
    const { rerender } = renderPoems([]);
    expect(screen.getByText(ADMIN_HOME_PAGE_COPY.empty.poem)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    rerender(<HomeEntryList kind="author" entries={[]} />);

    expect(screen.getByText(ADMIN_HOME_PAGE_COPY.empty.author)).toBeInTheDocument();
  });

  // implements FR-11 of home-page-sections
  it("marks only an entry that is not shown, and keeps its remove button", () => {
    renderPoems([entry("poem", 1, "Осень", false), entry("poem", 2, "Зима")]);

    expect(screen.getAllByText(ADMIN_HOME_PAGE_COPY.notShown)).toHaveLength(1);
    expect(screen.getByRole("button", { name: ADMIN_HOME_PAGE_COPY.removeLabel("Осень") })).toBeEnabled();
  });

  // implements FR-9 of home-page-sections
  it("calls the move action with the entry's stored place and the place it is dropped on", async () => {
    vi.mocked(moveHomeEntryAction).mockResolvedValue(moved("moved"));
    renderPoems();

    drop("poem-3", "poem-2");

    await waitFor(() =>
      expect(moveHomeEntryAction).toHaveBeenCalledWith({ kind: "poem", id: "poem-3", fromPosition: 3, toPosition: 2 }),
    );
  });

  // implements FR-9 of home-page-sections
  it("shows the new order at once, while the move is out", async () => {
    let finish: (response: MoveResponse) => void = () => undefined;
    vi.mocked(moveHomeEntryAction).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderPoems();

    drop("poem-3", "poem-2");

    await waitFor(() => expect(labelsInOrder()).toEqual(["Осень", "Весна", "Зима"]));
    expect(screen.getByRole("button", { name: ADMIN_HOME_PAGE_COPY.handleLabel("Осень") })).toBeDisabled();
    await act(async () => finish(moved("moved")));
  });

  // implements FR-9 of home-page-sections
  it("sends one move at a time: a second drop that lands before the first answers is ignored", async () => {
    let finish: (response: MoveResponse) => void = () => undefined;
    vi.mocked(moveHomeEntryAction).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderPoems();

    act(() => {
      dnd.onDragEnd?.({ active: { id: "poem-3" }, over: { id: "poem-2" } });
      dnd.onDragEnd?.({ active: { id: "poem-1" }, over: { id: "poem-3" } });
    });

    expect(moveHomeEntryAction).toHaveBeenCalledTimes(1);
    expect(moveHomeEntryAction).toHaveBeenCalledWith({ kind: "poem", id: "poem-3", fromPosition: 3, toPosition: 2 });
    await act(async () => finish(moved("moved")));
  });

  // implements FR-9 of home-page-sections
  it("takes the next drop once the first has answered", async () => {
    vi.mocked(moveHomeEntryAction).mockResolvedValue(moved("moved"));
    renderPoems();

    drop("poem-3", "poem-2");
    await waitFor(() => expect(moveHomeEntryAction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: ADMIN_HOME_PAGE_COPY.handleLabel("Осень") })).toBeEnabled());
    drop("poem-1", "poem-2");

    await waitFor(() => expect(moveHomeEntryAction).toHaveBeenCalledTimes(2));
  });

  // implements FR-9 of home-page-sections
  it("calls nothing for a drop on the same place or on nothing", () => {
    renderPoems();

    drop("poem-2", "poem-2");
    drop("poem-2", null);

    expect(moveHomeEntryAction).not.toHaveBeenCalled();
  });

  // implements FR-9 of home-page-sections
  it("restores the stored order and says the list changed after a stale drop", async () => {
    vi.mocked(moveHomeEntryAction).mockResolvedValue(moved("stale"));
    renderPoems();

    drop("poem-3", "poem-1");

    expect(await screen.findByText(ADMIN_HOME_PAGE_COPY.stale)).toBeInTheDocument();
    expect(labelsInOrder()).toEqual(["Осень", "Зима", "Весна"]);
  });

  // implements FR-9 of home-page-sections
  it("restores the stored order and shows a danger alert after a refused or lost move", async () => {
    vi.mocked(moveHomeEntryAction).mockRejectedValue(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderPoems();

    drop("poem-1", "poem-3");

    expect(await screen.findByRole("alert")).toHaveTextContent(ADMIN_HOME_PAGE_COPY.moveFailed);
    expect(labelsInOrder()).toEqual(["Осень", "Зима", "Весна"]);
  });

  // implements FR-9 of home-page-sections
  it("words a refused admin check with the forbidden line", async () => {
    vi.mocked(moveHomeEntryAction).mockResolvedValue({ data: { ok: false, reason: "forbidden" } } as MoveResponse);
    renderPoems();

    drop("poem-1", "poem-2");

    expect(await screen.findByRole("alert")).toHaveTextContent(ADD_TO_HOME_COPY.forbidden);
  });

  // implements FR-9 of home-page-sections
  it("calls the remove action with the entry's kind and id", async () => {
    vi.mocked(removeHomeEntryAction).mockResolvedValue(removed("removed"));
    const user = userEvent.setup();
    renderPoems();

    await user.click(screen.getByRole("button", { name: ADMIN_HOME_PAGE_COPY.removeLabel("Зима") }));

    await waitFor(() => expect(removeHomeEntryAction).toHaveBeenCalledWith({ kind: "poem", id: "poem-2" }));
    expect(screen.queryByText(ADMIN_HOME_PAGE_COPY.stale)).not.toBeInTheDocument();
  });

  // implements FR-9 of home-page-sections
  it("says the list changed when the removed entry is already gone", async () => {
    vi.mocked(removeHomeEntryAction).mockResolvedValue(removed("not-found"));
    const user = userEvent.setup();
    renderPoems();

    await user.click(screen.getByRole("button", { name: ADMIN_HOME_PAGE_COPY.removeLabel("Осень") }));

    expect(await screen.findByText(ADMIN_HOME_PAGE_COPY.stale)).toBeInTheDocument();
  });

  // implements FR-9 of home-page-sections
  it("disables the handles and the remove buttons while offline, and calls nothing", async () => {
    connection.status = "offline";
    const user = userEvent.setup();
    renderPoems();

    for (const label of ["Осень", "Зима", "Весна"]) {
      expect(screen.getByRole("button", { name: ADMIN_HOME_PAGE_COPY.handleLabel(label) })).toBeDisabled();
      expect(screen.getByRole("button", { name: ADMIN_HOME_PAGE_COPY.removeLabel(label) })).toBeDisabled();
    }
    await user.click(screen.getByRole("button", { name: ADMIN_HOME_PAGE_COPY.removeLabel("Осень") }));
    expect(removeHomeEntryAction).not.toHaveBeenCalled();
  });

  // implements FR-9 of home-page-sections
  it("lifts a handle with a mouse, a touch hold or the keyboard, and speaks Russian when it does", () => {
    renderPoems();

    const sensors = dnd.sensors.map((descriptor) => descriptor.sensor);
    expect(sensors).toEqual(expect.arrayContaining([MouseSensor, TouchSensor, KeyboardSensor]));
    expect(dnd.announcements?.onDragStart?.({ active: { id: "poem-2" } })).toBe(
      ADMIN_HOME_PAGE_COPY.picked("Зима", 2, 3),
    );
    expect(dnd.announcements?.onDragOver?.({ active: { id: "poem-2" }, over: { id: "poem-3" } })).toBe(ADMIN_HOME_PAGE_COPY.moved(3, 3));
    expect(dnd.announcements?.onDragEnd?.({ over: { id: "poem-1" } })).toBe(ADMIN_HOME_PAGE_COPY.dropped(1, 3));
    expect(dnd.announcements?.onDragCancel?.({})).toBe(ADMIN_HOME_PAGE_COPY.cancelled);
  });
});
