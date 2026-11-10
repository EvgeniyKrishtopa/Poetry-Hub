import { render, screen } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth";

import { CollectionContent } from "../../components/CollectionContent/CollectionContent";
import { CollectionPage } from "../../components/CollectionPage/CollectionPage";
import { CollectionPageSkeleton } from "../../components/CollectionPageSkeleton/CollectionPageSkeleton";
import { EditCollectionButton } from "../../components/EditCollectionButton/EditCollectionButton";
import { getCollectionPoemChoices } from "../../dal/collection-poems";
import { getOwnCollection } from "../../dal/own-collections";
import type { CollectionPoemChoice, OwnCollection } from "../../model/collection-management.types";

vi.mock("@/features/auth", () => ({ requireSession: vi.fn() }));
vi.mock("../../dal/own-collections", () => ({ getOwnCollection: vi.fn() }));
vi.mock("../../dal/collection-poems", () => ({ getCollectionPoemChoices: vi.fn() }));
vi.mock("../../actions/delete-collection.actions", () => ({ deleteCollectionAction: vi.fn() }));
vi.mock("../../actions/check-collection-poems.actions", () => ({ checkCollectionPoemsAction: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const COLLECTION_ID = "40000000-0000-4000-8000-000000000031";
const COLLECTION: OwnCollection = { id: COLLECTION_ID, title: "Осенний цикл", description: "Стихи октября" };
const IN_COLLECTION: CollectionPoemChoice = {
  id: "50000000-0000-4000-8000-000000000002",
  title: "Ночной вокзал",
  selected: true,
};
const FREE: CollectionPoemChoice = { id: "50000000-0000-4000-8000-000000000001", title: "Осенний сад", selected: false };
const MANAGE_NAME = "Произведения сборника";

async function renderContent() {
  return render(await CollectionContent({ collectionId: Promise.resolve(COLLECTION_ID) }));
}

/** The page's own paragraphs; the closed delete dialog's description is one too. */
function paragraphs(): HTMLParagraphElement[] {
  return Array.from(document.querySelectorAll("p")).filter((paragraph) => paragraph.closest("dialog") === null);
}

beforeEach(() => {
  vi.mocked(requireSession).mockResolvedValue({ state: "signed-in", userId: USER_ID });
  vi.mocked(getOwnCollection).mockResolvedValue({ ok: true, collection: COLLECTION });
  vi.mocked(getCollectionPoemChoices).mockResolvedValue({ ok: true, choices: [] });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("CollectionContent", () => {
  // implements FR-6 of add-poem-collections
  it("shows the title as the page heading, the description, then the edit link before the delete button", async () => {
    await renderContent();

    expect(getOwnCollection).toHaveBeenCalledExactlyOnceWith(COLLECTION_ID);
    expect(screen.getByRole("heading", { level: 1, name: "Осенний цикл" })).toBeInTheDocument();
    expect(paragraphs().map((paragraph) => paragraph.textContent)).toEqual(["Стихи октября"]);
    const edit = screen.getByRole("link", { name: "Редактировать сборник" });
    const remove = screen.getByRole("button", { name: "Удалить сборник" });
    expect(edit).toHaveAttribute("href", `/account/poems/collections/${COLLECTION_ID}/edit`);
    expect(edit.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(edit.parentElement).toBe(remove.parentElement);
    expect(edit.parentElement).toHaveClass("flex-wrap", "gap-2");
  });

  // implements FR-6 of add-poem-collections
  it("splits the description into paragraphs at blank lines and keeps a single line break inside one", async () => {
    vi.mocked(getOwnCollection).mockResolvedValue({
      ok: true,
      collection: { ...COLLECTION, description: "Стихи октября\nи ноября\n\nБез посвящений" },
    });

    await renderContent();

    const shown = paragraphs();
    expect(shown.map((paragraph) => paragraph.textContent)).toEqual(["Стихи октября\nи ноября", "Без посвящений"]);
    for (const paragraph of shown) expect(paragraph).toHaveClass("whitespace-pre-line");
  });

  // implements FR-6 of add-poem-collections
  it("renders no paragraph for a collection without a description", async () => {
    vi.mocked(getOwnCollection).mockResolvedValue({ ok: true, collection: { ...COLLECTION, description: null } });

    await renderContent();

    expect(paragraphs()).toEqual([]);
    expect(screen.getByRole("heading", { level: 1, name: "Осенний цикл" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Редактировать сборник" })).toBeInTheDocument();
  });

  // implements FR-6 of add-poem-collections
  it("renders the 404 page for a collection that isn't the author's own", async () => {
    vi.mocked(getOwnCollection).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(CollectionContent({ collectionId: Promise.resolve(COLLECTION_ID) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  // implements FR-6 of add-poem-collections
  it("throws to the error screen when the collection can't be read", async () => {
    vi.mocked(getOwnCollection).mockResolvedValue({ ok: false, reason: "unavailable" });

    await expect(CollectionContent({ collectionId: Promise.resolve(COLLECTION_ID) })).rejects.toThrow(
      "Collection page unavailable",
    );
  });

  // implements FR-2 of add-poems-to-collections
  it("shows neither the poems heading nor the manage button when there is nothing to manage", async () => {
    await renderContent();

    expect(getCollectionPoemChoices).toHaveBeenCalledExactlyOnceWith(COLLECTION_ID);
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    expect(screen.queryByRole("button", { name: MANAGE_NAME })).toBeNull();
    expect(screen.getByRole("link", { name: "Редактировать сборник" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Удалить сборник" })).toBeInTheDocument();
  });

  // implements FR-2 of add-poems-to-collections
  it("lists only the collection's own poems between the description and the row, with the manage button", async () => {
    vi.mocked(getCollectionPoemChoices).mockResolvedValue({ ok: true, choices: [IN_COLLECTION, FREE] });

    await renderContent();

    const heading = screen.getByRole("heading", { level: 2, name: "Произведения" });
    const poemLink = screen.getByRole("link", { name: "Ночной вокзал" });
    expect(poemLink).toHaveAttribute("href", `/account/poems/${IN_COLLECTION.id}`);
    expect(screen.queryByRole("link", { name: "Осенний сад" })).toBeNull();
    const [description] = paragraphs();
    const edit = screen.getByRole("link", { name: "Редактировать сборник" });
    expect((description as Node).compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(poemLink.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: MANAGE_NAME }).parentElement).toBe(edit.parentElement);
  });

  // implements FR-2 of add-poems-to-collections
  it("shows the manage button but no poems heading for an empty collection while a free poem exists", async () => {
    vi.mocked(getCollectionPoemChoices).mockResolvedValue({ ok: true, choices: [FREE] });

    await renderContent();

    expect(screen.getByRole("button", { name: MANAGE_NAME })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  });

  // implements FR-2 of add-poems-to-collections
  it("throws to the error screen when the collection's poems can't be read", async () => {
    vi.mocked(getCollectionPoemChoices).mockResolvedValue({ ok: false });

    await expect(CollectionContent({ collectionId: Promise.resolve(COLLECTION_ID) })).rejects.toThrow(
      "Collection poems unavailable",
    );
  });

  // implements FR-2 of add-poems-to-collections
  it("reads no poems for a collection that isn't the author's own", async () => {
    vi.mocked(getOwnCollection).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(CollectionContent({ collectionId: Promise.resolve(COLLECTION_ID) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getCollectionPoemChoices).not.toHaveBeenCalled();
  });

  // implements FR-16 of add-poem-collections
  it("checks the session before reading the collection", async () => {
    await renderContent();

    expect(requireSession).toHaveBeenCalledTimes(1);
    expect(vi.mocked(requireSession).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(getOwnCollection).mock.invocationCallOrder[0] ?? 0,
    );
  });

  // implements FR-16 of add-poem-collections
  it("reads nothing when the session gate redirects", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    vi.mocked(requireSession).mockRejectedValue(redirect);

    await expect(CollectionContent({ collectionId: Promise.resolve(COLLECTION_ID) })).rejects.toBe(redirect);
    expect(getOwnCollection).not.toHaveBeenCalled();
  });

  // implements FR-16 of add-poem-collections
  it("shows the session-unavailable alert and reads nothing when the session can't be checked", async () => {
    vi.mocked(requireSession).mockResolvedValue({ state: "unknown" });

    await renderContent();

    expect(screen.getByRole("alert")).toHaveTextContent("Сервис временно недоступен. Попробуйте позже.");
    expect(getOwnCollection).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading")).toBeNull();
  });
});

describe("EditCollectionButton", () => {
  // implements FR-6 of add-poem-collections
  it("is a primary link «Редактировать сборник» to the collection's edit page", () => {
    render(<EditCollectionButton collectionId={COLLECTION_ID} />);

    const link = screen.getByRole("link", { name: "Редактировать сборник" });
    expect(link).toHaveAttribute("href", `/account/poems/collections/${COLLECTION_ID}/edit`);
    expect(link).toHaveClass("primary");
  });
});

describe("CollectionPage", () => {
  // implements FR-6, NFR-8 of add-poem-collections
  it("streams the collection behind its skeleton, on a lang=ru root", () => {
    const collectionId = Promise.resolve(COLLECTION_ID);
    const element = CollectionPage({ collectionId }) as ReactElement<{
      lang: string;
      children: ReactElement<{ fallback: ReactElement; children: ReactElement<{ collectionId: Promise<string> }> }>;
    }>;

    expect(element.props.lang).toBe("ru");
    const boundary = element.props.children;
    expect(boundary.type).toBe(Suspense);
    expect(boundary.props.fallback.type).toBe(CollectionPageSkeleton);
    expect(boundary.props.children.type).toBe(CollectionContent);
    expect(boundary.props.children.props.collectionId).toBe(collectionId);
  });
});

describe("CollectionPageSkeleton", () => {
  // implements FR-6 of add-poem-collections
  it("announces loading and draws a heading bar, two text bars, and two button bars", () => {
    const { container } = render(<CollectionPageSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Загрузка…");
    expect(container.querySelectorAll("[data-skeleton]")).toHaveLength(5);
  });
});
