import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getOwnPublicAuthor } from "@/features/authors";

import { WorkBoardContent } from "../../components/WorkBoardContent/WorkBoardContent";
import { listOwnBoard } from "../../dal/own-board";
import { BOARD } from "../model/board-fixtures";

vi.mock("@/features/authors", () => ({ getOwnPublicAuthor: vi.fn() }));
vi.mock("../../dal/own-board", () => ({ listOwnBoard: vi.fn() }));
vi.mock("../../components/WorkBoardIsland/WorkBoardIsland", () => ({
  WorkBoardIsland: ({ arrangement }: { arrangement: { collections: unknown[] } }) => (
    <p data-testid="island">{arrangement.collections.length} collections</p>
  ),
}));

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

async function renderContent() {
  const content = await WorkBoardContent();
  return render(<>{content}</>);
}

beforeEach(() => {
  vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "public", authorId: AUTHOR_ID });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("WorkBoardContent", () => {
  // implements FR-9 of drag-and-drop-ordering
  it("reads the board for the own author and renders the island with it", async () => {
    vi.mocked(listOwnBoard).mockResolvedValue({ ok: true, arrangement: BOARD });

    await renderContent();

    expect(listOwnBoard).toHaveBeenCalledExactlyOnceWith(AUTHOR_ID);
    expect(screen.getByTestId("island")).toHaveTextContent("3 collections");
  });

  // implements FR-9 of drag-and-drop-ordering: failure matrix row 1
  it("shows the collections alert and no board when the collections read fails", async () => {
    vi.mocked(listOwnBoard).mockResolvedValue({ ok: false, reason: "collections-unavailable" });

    await renderContent();

    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить сборники. Попробуйте позже.");
    expect(screen.queryByTestId("island")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // implements FR-9 of drag-and-drop-ordering: failure matrix rows 2 and 3
  it("shows the poems alert and no board when the poems read fails", async () => {
    vi.mocked(listOwnBoard).mockResolvedValue({ ok: false, reason: "poems-unavailable" });

    await renderContent();

    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить произведения. Попробуйте позже.");
    expect(screen.queryByTestId("island")).not.toBeInTheDocument();
  });

  // implements FR-9 of drag-and-drop-ordering
  it("renders nothing when the author has no poem and no collection", async () => {
    vi.mocked(listOwnBoard).mockResolvedValue({ ok: true, arrangement: { collections: [], freePoems: [] } });

    const view = await renderContent();

    expect(view.container).toBeEmptyDOMElement();
  });

  // implements FR-3 of drag-and-drop-ordering: the last poem left, the collection stays on the owner's board
  it("renders the island for a collection with no poem and no free poem", async () => {
    vi.mocked(listOwnBoard).mockResolvedValue({
      ok: true,
      arrangement: { collections: [{ id: "c", title: "Пустой", poems: [] }], freePoems: [] },
    });

    await renderContent();

    expect(screen.getByTestId("island")).toBeInTheDocument();
  });

  it.each([
    ["a not-public profile", { ok: true, status: "not-public" }],
    ["an unreadable profile", { ok: false }],
  ] as const)("renders nothing and reads nothing for %s", async (_case, own) => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue(own as Awaited<ReturnType<typeof getOwnPublicAuthor>>);

    const view = await renderContent();

    expect(view.container).toBeEmptyDOMElement();
    expect(listOwnBoard).not.toHaveBeenCalled();
  });
});
