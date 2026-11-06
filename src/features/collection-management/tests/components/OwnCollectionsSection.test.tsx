import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getOwnPublicAuthor } from "@/features/authors";

import { CreateCollectionLink } from "../../components/CreateCollectionLink/CreateCollectionLink";
import { OwnCollectionsSection } from "../../components/OwnCollectionsSection/OwnCollectionsSection";
import { listOwnCollections } from "../../dal/own-collections";

vi.mock("@/features/authors", () => ({ getOwnPublicAuthor: vi.fn() }));
vi.mock("../../dal/own-collections", () => ({ listOwnCollections: vi.fn() }));

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const SPRING_ID = "40000000-0000-4000-8000-000000000002";
const AUTUMN_ID = "40000000-0000-4000-8000-000000000001";

async function renderSection() {
  return render(await OwnCollectionsSection());
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
    vi.mocked(listOwnCollections).mockResolvedValue({
      ok: true,
      collections: [
        { id: SPRING_ID, title: "Весна" },
        { id: AUTUMN_ID, title: "Осенний цикл" },
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
    expect(listOwnCollections).toHaveBeenCalledExactlyOnceWith(AUTHOR_ID);
  });

  // implements FR-1, FR-13 of add-poem-collections
  it("renders nothing when the author has no collections", async () => {
    vi.mocked(listOwnCollections).mockResolvedValue({ ok: true, collections: [] });

    const { container } = await renderSection();

    expect(container).toBeEmptyDOMElement();
  });

  // implements FR-2 of add-poem-collections
  it("shows the failure alert and no heading when the collections can't be read", async () => {
    vi.mocked(listOwnCollections).mockResolvedValue({ ok: false });

    await renderSection();

    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить сборники. Попробуйте позже.");
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it.each([
    ["not public", { ok: true, status: "not-public" } as const],
    ["unreadable", { ok: false, failure: "unavailable" } as const],
  ])("renders nothing and reads no collections when the own profile is %s", async (_case, own) => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue(own);

    const { container } = await renderSection();

    expect(container).toBeEmptyDOMElement();
    expect(listOwnCollections).not.toHaveBeenCalled();
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
