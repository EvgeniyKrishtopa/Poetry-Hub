import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PublicCollectionsSection } from "../../components/PublicCollectionsSection/PublicCollectionsSection";
import { listAuthorCollections } from "../../dal/public-collections";
import type { PublicCollection } from "../../model/public-collections.types";

vi.mock("../../dal/public-collections", () => ({ listAuthorCollections: vi.fn() }));

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

const SPRING: PublicCollection = {
  id: "7a6b5c4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d",
  title: "Весна",
  description: "Стихи о весне",
  poems: [{ id: "30000000-0000-4000-8000-000000000053", title: "Первый снег" }],
};

const AUTUMN: PublicCollection = {
  id: "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a",
  title: "Осенний цикл",
  description: null,
  poems: [
    { id: "30000000-0000-4000-8000-000000000052", title: "Ночной вокзал" },
    { id: "30000000-0000-4000-8000-000000000051", title: "Осенний сад" },
  ],
};

async function renderSection() {
  return render(await PublicCollectionsSection({ authorId: Promise.resolve(AUTHOR_ID) }));
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("PublicCollectionsSection", () => {
  // implements FR-2, NFR-6 of public-collections
  it("lists each collection with its poems nested in the item, in order, with their hrefs", async () => {
    vi.mocked(listAuthorCollections).mockResolvedValue({ ok: true, collections: [SPRING, AUTUMN] });

    const { container } = await renderSection();

    expect(listAuthorCollections).toHaveBeenCalledWith(AUTHOR_ID);
    expect(container.firstElementChild).toHaveAttribute("lang", "ru");
    expect(screen.getByRole("heading", { level: 2, name: "Сборники произведений" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();

    const [outerList] = screen.getAllByRole("list");
    const items = Array.from(outerList.children).map((item) => within(item as HTMLElement));
    expect(items).toHaveLength(2);

    const [springItem, autumnItem] = items;
    expect(springItem.getByRole("link", { name: "Весна" })).toHaveAttribute(
      "href",
      `/authors/${AUTHOR_ID}/collections/${SPRING.id}`,
    );
    const springPoems = within(springItem.getByRole("list")).getAllByRole("link");
    expect(springPoems.map((link) => link.getAttribute("href"))).toEqual([
      `/authors/${AUTHOR_ID}/poems/${SPRING.poems[0].id}`,
    ]);

    expect(autumnItem.getByRole("link", { name: "Осенний цикл" })).toHaveAttribute(
      "href",
      `/authors/${AUTHOR_ID}/collections/${AUTUMN.id}`,
    );
    const autumnPoems = within(autumnItem.getByRole("list")).getAllByRole("link");
    expect(autumnPoems.map((link) => link.textContent)).toEqual(["Ночной вокзал", "Осенний сад"]);
    expect(autumnPoems.map((link) => link.getAttribute("href"))).toEqual([
      `/authors/${AUTHOR_ID}/poems/${AUTUMN.poems[0].id}`,
      `/authors/${AUTHOR_ID}/poems/${AUTUMN.poems[1].id}`,
    ]);
  });

  // implements FR-2 of public-collections
  it("shows no description, date, or count", async () => {
    vi.mocked(listAuthorCollections).mockResolvedValue({ ok: true, collections: [SPRING] });

    await renderSection();

    expect(screen.queryByText("Стихи о весне")).toBeNull();
    expect(screen.queryByRole("time")).toBeNull();
  });

  // implements NFR-6 of public-collections
  it("gives every link a visible focus outline", async () => {
    vi.mocked(listAuthorCollections).mockResolvedValue({ ok: true, collections: [SPRING] });

    await renderSection();

    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveClass("focus-visible:outline-2", "focus-visible:outline-accent");
    }
  });

  // implements FR-2 of public-collections
  it("renders nothing when the author has no visible collection", async () => {
    vi.mocked(listAuthorCollections).mockResolvedValue({ ok: true, collections: [] });

    const { container } = await renderSection();

    expect(container).toBeEmptyDOMElement();
  });

  // implements FR-4 of public-collections
  it("shows the heading and the muted unavailable text, and no list, when the collections can't be read but a poem is collected", async () => {
    vi.mocked(listAuthorCollections).mockResolvedValue({
      ok: false,
      reason: "collections-unavailable",
      hasCollectedPoems: true,
    });

    await renderSection();

    expect(screen.getByRole("heading", { level: 2, name: "Сборники произведений" })).toBeInTheDocument();
    expect(screen.getByText("Сборники сейчас недоступны.")).toHaveClass("text-muted");
    expect(screen.queryByRole("list")).toBeNull();
  });

  // implements FR-4 of public-collections
  it("renders nothing when the collections can't be read and no poem is collected", async () => {
    vi.mocked(listAuthorCollections).mockResolvedValue({
      ok: false,
      reason: "collections-unavailable",
      hasCollectedPoems: false,
    });

    const { container } = await renderSection();

    expect(container).toBeEmptyDOMElement();
  });

  // implements FR-4 of public-collections
  it("renders nothing when the poems can't be read", async () => {
    vi.mocked(listAuthorCollections).mockResolvedValue({ ok: false, reason: "poems-unavailable" });

    const { container } = await renderSection();

    expect(container).toBeEmptyDOMElement();
  });
});
