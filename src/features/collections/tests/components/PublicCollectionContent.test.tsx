import { render, screen, within } from "@testing-library/react";
import { notFound } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicAuthorName } from "@/features/authors";

import { PublicCollectionContent } from "../../components/PublicCollectionContent/PublicCollectionContent";
import { getPublicCollection } from "../../dal/public-collections";
import type { PublicCollection } from "../../model/public-collections.types";

vi.mock("@/features/authors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/authors")>()),
  getPublicAuthorName: vi.fn(),
}));
vi.mock("../../dal/public-collections", () => ({ getPublicCollection: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const COLLECTION_ID = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";

const AUTUMN: PublicCollection = {
  id: COLLECTION_ID,
  title: "Осенний цикл",
  description: "Первая строка.\nВторая строка.\n\nВторой абзац.",
  poems: [
    { id: "30000000-0000-4000-8000-000000000052", title: "Ночной вокзал" },
    { id: "30000000-0000-4000-8000-000000000051", title: "Осенний сад" },
  ],
};

async function renderContent() {
  return render(
    await PublicCollectionContent({ authorId: Promise.resolve(AUTHOR_ID), collectionId: Promise.resolve(COLLECTION_ID) }),
  );
}

function callContent() {
  return PublicCollectionContent({ authorId: Promise.resolve(AUTHOR_ID), collectionId: Promise.resolve(COLLECTION_ID) });
}

function mockFoundAuthor() {
  vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: true, name: "Анна Ахматова" });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("PublicCollectionContent", () => {
  // implements FR-5, NFR-6 of public-collections
  it("renders the title as h1, the description paragraphs, the h2 «Произведения», and the poem links in order", async () => {
    mockFoundAuthor();
    vi.mocked(getPublicCollection).mockResolvedValue({ ok: true, collection: AUTUMN });

    const { container } = await renderContent();

    expect(getPublicCollection).toHaveBeenCalledWith(AUTHOR_ID, COLLECTION_ID);
    expect(container.firstElementChild).toHaveAttribute("lang", "ru");
    expect(screen.getByRole("heading", { level: 1, name: "Осенний цикл" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Произведения" })).toBeInTheDocument();

    const paragraphs = Array.from(container.querySelectorAll("p"));
    expect(paragraphs.map((paragraph) => paragraph.textContent)).toEqual([
      "Первая строка.\nВторая строка.",
      "Второй абзац.",
    ]);
    for (const paragraph of paragraphs) expect(paragraph).toHaveClass("whitespace-pre-line");

    const links = within(screen.getByRole("list")).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Ночной вокзал", "Осенний сад"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      `/authors/${AUTHOR_ID}/poems/${AUTUMN.poems[0].id}`,
      `/authors/${AUTHOR_ID}/poems/${AUTUMN.poems[1].id}`,
    ]);
  });

  // implements FR-5, FR-8 of public-collections
  it("shows no management control: no button and no link besides the poems", async () => {
    mockFoundAuthor();
    vi.mocked(getPublicCollection).mockResolvedValue({ ok: true, collection: AUTUMN });

    await renderContent();

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(AUTUMN.poems.length);
  });

  // implements FR-5 of public-collections
  it("renders no description element for a collection without one", async () => {
    mockFoundAuthor();
    vi.mocked(getPublicCollection).mockResolvedValue({ ok: true, collection: { ...AUTUMN, description: null } });

    const { container } = await renderContent();

    expect(container.querySelector("p")).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Осенний цикл" })).toBeInTheDocument();
  });

  // implements FR-1 of public-collections
  it("calls notFound() for an unknown or non-public author, without reading the collection", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(callContent()).rejects.toThrow("404");
    expect(notFound).toHaveBeenCalledOnce();
    expect(getPublicCollection).not.toHaveBeenCalled();
  });

  // implements FR-1, FR-5 of public-collections
  it("calls notFound() for a collection that isn't a visible collection of the author", async () => {
    mockFoundAuthor();
    vi.mocked(getPublicCollection).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(callContent()).rejects.toThrow("404");
    expect(notFound).toHaveBeenCalledOnce();
  });

  // implements FR-5 of public-collections
  it("throws to the route's error screen when the author is unavailable, without reading the collection", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: false, reason: "unavailable" });

    await expect(callContent()).rejects.toThrow("Collection page unavailable");
    expect(notFound).not.toHaveBeenCalled();
    expect(getPublicCollection).not.toHaveBeenCalled();
  });

  // implements FR-5 of public-collections
  it("throws to the route's error screen when the collection is unavailable", async () => {
    mockFoundAuthor();
    vi.mocked(getPublicCollection).mockResolvedValue({ ok: false, reason: "unavailable" });

    await expect(callContent()).rejects.toThrow("Collection page unavailable");
    expect(notFound).not.toHaveBeenCalled();
  });
});
