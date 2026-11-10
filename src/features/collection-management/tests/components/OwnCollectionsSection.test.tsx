import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getOwnPublicAuthor } from "@/features/authors";

import { CreateCollectionLink } from "../../components/CreateCollectionLink/CreateCollectionLink";
import { OwnCollectionsSection } from "../../components/OwnCollectionsSection/OwnCollectionsSection";
import { listOwnCollectionsWithPoems } from "../../dal/own-collections-with-poems";

vi.mock("@/features/authors", () => ({ getOwnPublicAuthor: vi.fn() }));
vi.mock("../../dal/own-collections-with-poems", () => ({ listOwnCollectionsWithPoems: vi.fn() }));

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const SPRING_ID = "40000000-0000-4000-8000-000000000002";
const AUTUMN_ID = "40000000-0000-4000-8000-000000000001";
const EMPTY_ID = "40000000-0000-4000-8000-000000000003";
const NEWEST_SPRING_POEM_ID = "50000000-0000-4000-8000-000000000003";
const AUTUMN_POEM_ID = "50000000-0000-4000-8000-000000000002";
const OLDEST_SPRING_POEM_ID = "50000000-0000-4000-8000-000000000001";

async function renderSection() {
  return render(await OwnCollectionsSection());
}

/** `[title, href]` of each poem link nested under a collection's title link, or `null` when it has no nested list. */
function nestedPoemsUnder(collectionTitle: string) {
  const item = screen.getByRole("link", { name: collectionTitle }).closest("li");
  if (!item) throw new Error(`no list item for ${collectionTitle}`);
  const nested = within(item).queryByRole("list");
  if (!nested) return null;
  return within(nested)
    .getAllByRole("link")
    .map((link) => [link.textContent, link.getAttribute("href")]);
}

beforeEach(() => {
  vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "public", authorId: AUTHOR_ID });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("OwnCollectionsSection", () => {
  // implements FR-2, NFR-4 of add-poem-collections
  it("lists the author's collections in the read's order under a section labelled by its h2", async () => {
    vi.mocked(listOwnCollectionsWithPoems).mockResolvedValue({
      ok: true,
      collections: [
        { id: SPRING_ID, title: "Весна", poems: [] },
        { id: AUTUMN_ID, title: "Осенний цикл", poems: [] },
      ],
    });

    await renderSection();

    const section = screen.getByRole("region", { name: "Сборники произведений" });
    expect(within(section).getByRole("heading", { level: 2 })).toHaveTextContent("Сборники произведений");
    const links = within(section).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Весна", "Осенний цикл"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      `/account/poems/collections/${SPRING_ID}`,
      `/account/poems/collections/${AUTUMN_ID}`,
    ]);
    expect(listOwnCollectionsWithPoems).toHaveBeenCalledExactlyOnceWith(AUTHOR_ID);
  });

  // implements FR-11 of add-poems-to-collections
  it("nests each collection's poems under its title in order, and a collection with none shows its title only", async () => {
    vi.mocked(listOwnCollectionsWithPoems).mockResolvedValue({
      ok: true,
      collections: [
        {
          id: SPRING_ID,
          title: "Весна",
          poems: [
            { collectionId: SPRING_ID, id: NEWEST_SPRING_POEM_ID, title: "Капель" },
            { collectionId: SPRING_ID, id: OLDEST_SPRING_POEM_ID, title: "Проталина" },
          ],
        },
        { id: EMPTY_ID, title: "Пустой", poems: [] },
        {
          id: AUTUMN_ID,
          title: "Осенний цикл",
          poems: [{ collectionId: AUTUMN_ID, id: AUTUMN_POEM_ID, title: "Листопад" }],
        },
      ],
    });

    await renderSection();

    expect(nestedPoemsUnder("Весна")).toEqual([
      ["Капель", `/account/poems/${NEWEST_SPRING_POEM_ID}`],
      ["Проталина", `/account/poems/${OLDEST_SPRING_POEM_ID}`],
    ]);
    expect(nestedPoemsUnder("Осенний цикл")).toEqual([["Листопад", `/account/poems/${AUTUMN_POEM_ID}`]]);
    expect(nestedPoemsUnder("Пустой")).toBeNull();
  });

  // implements FR-1, FR-13 of add-poem-collections
  it("renders nothing when the author has no collections", async () => {
    vi.mocked(listOwnCollectionsWithPoems).mockResolvedValue({ ok: true, collections: [] });

    const { container } = await renderSection();

    expect(container).toBeEmptyDOMElement();
  });

  // implements FR-2 of add-poem-collections, FR-11 of add-poems-to-collections
  it("shows the failure alert and no heading when the collections can't be read", async () => {
    vi.mocked(listOwnCollectionsWithPoems).mockResolvedValue({ ok: false });

    await renderSection();

    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить сборники. Попробуйте позже.");
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it.each([
    ["not public", { ok: true, status: "not-public" } as const],
    ["unreadable", { ok: false, failure: "unavailable" } as const],
  ])("renders nothing and reads no collections when the own profile is %s", async (_case, own) => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue(own);

    const { container } = await renderSection();

    expect(container).toBeEmptyDOMElement();
    expect(listOwnCollectionsWithPoems).not.toHaveBeenCalled();
  });
});

describe("CreateCollectionLink", () => {
  // implements FR-1 of add-poem-collections
  it("links «Создать сборник произведений» to the create page", () => {
    render(<CreateCollectionLink />);

    expect(screen.getByRole("link", { name: "Создать сборник произведений" })).toHaveAttribute(
      "href",
      "/account/poems/collections/new",
    );
  });
});
