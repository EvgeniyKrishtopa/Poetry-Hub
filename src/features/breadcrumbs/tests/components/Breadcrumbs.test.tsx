import { render } from "@testing-library/react";
import { Suspense, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth";
import { getOwnPublicAuthor, getPublicAuthorName } from "@/features/authors";
import { getOwnCollectionTitle } from "@/features/collection-management";
import { getAuthorPoem } from "@/features/poems";

import { Breadcrumbs } from "../../components/Breadcrumbs/Breadcrumbs";
import { BreadcrumbsLoader } from "../../components/BreadcrumbsLoader/BreadcrumbsLoader";
import { BreadcrumbsPlaceholder } from "../../components/BreadcrumbsPlaceholder/BreadcrumbsPlaceholder";
import { BreadcrumbsView } from "../../components/BreadcrumbsView/BreadcrumbsView";

vi.mock("@/features/authors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/authors")>()),
  getPublicAuthorName: vi.fn(),
  getOwnPublicAuthor: vi.fn(),
}));

vi.mock("@/features/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth")>()),
  requireSession: vi.fn(),
}));

vi.mock("@/features/poems", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/poems")>()),
  getAuthorPoem: vi.fn(),
}));

vi.mock("@/features/collection-management", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/collection-management")>()),
  getOwnCollectionTitle: vi.fn(),
}));

const ANNA_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

afterEach(() => {
  vi.clearAllMocks();
});

describe("BreadcrumbsPlaceholder", () => {
  // implements NFR-4 of add-breadcrumbs
  it("holds one row of the trail's height, hidden from assistive technology", () => {
    const { container } = render(<BreadcrumbsPlaceholder />);

    const root = container.firstElementChild;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root).toHaveClass("pt-4");
    expect(root?.querySelector(".h-5")).not.toBeNull();
  });
});

describe("Breadcrumbs", () => {
  // An async Server Component can't render in jsdom, so this checks the tree the wrapper returns.
  // implements NFR-4 of add-breadcrumbs
  it("streams the loader inside Suspense, with the placeholder as the fallback", () => {
    const segments = Promise.resolve(["authors"]);
    const element = Breadcrumbs({ segments });

    expect(element.type).toBe(Suspense);
    const { fallback, children } = element.props as {
      fallback: ReactElement;
      children: ReactElement<{ segments: unknown }>;
    };
    expect(fallback.type).toBe(BreadcrumbsPlaceholder);
    expect(children.type).toBe(BreadcrumbsLoader);
    expect(children.props.segments).toBe(segments);
  });
});

describe("BreadcrumbsLoader", () => {
  async function load(segments: readonly string[]): Promise<ReactNode> {
    return BreadcrumbsLoader({ segments: Promise.resolve(segments) });
  }

  // implements FR-1, FR-2 of add-breadcrumbs
  it("renders the view for a static page without reading any author", async () => {
    const element = (await load(["login"])) as ReactElement<{ items: unknown }>;

    expect(element.type).toBe(BreadcrumbsView);
    expect(element.props.items).toEqual([
      { kind: "link", label: "Главная", href: "/" },
      { kind: "current", label: "Вход" },
    ]);
    expect(getPublicAuthorName).not.toHaveBeenCalled();
  });

  // implements FR-4 of add-breadcrumbs
  it("reads the author's name for an author page", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: true, name: "Анна Ахматова" });

    const element = (await load(["authors", ANNA_ID])) as ReactElement<{ items: { label: string }[] }>;

    expect(getPublicAuthorName).toHaveBeenCalledWith(ANNA_ID);
    expect(element.props.items.map((item) => item.label)).toEqual(["Главная", "Наши авторы", "Анна Ахматова"]);
  });

  // implements FR-6 of refine-author-page-and-contact
  it("renders nothing and reads nothing for the removed poem list route", async () => {
    await expect(load(["authors", ANNA_ID, "poems"])).resolves.toBeNull();

    expect(getPublicAuthorName).not.toHaveBeenCalled();
    expect(getAuthorPoem).not.toHaveBeenCalled();
  });

  // implements FR-8, FR-12 of add-author-poems
  // implements FR-7 of refine-author-page-and-contact
  it("reads the author's name and the poem for a poem page", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: true, name: "Анна Ахматова" });
    const poemId = "30000000-0000-4000-8000-000000000021";
    vi.mocked(getAuthorPoem).mockResolvedValue({
      ok: true,
      poem: {
        id: poemId,
        title: "Осенний сад",
        text: "Строка",
        illustrationUrl: null,
        publishedAt: "2026-03-12",
        genreId: null,
      },
    });

    const element = (await load(["authors", ANNA_ID, "poems", poemId])) as ReactElement<{
      items: { label: string }[];
    }>;

    expect(getPublicAuthorName).toHaveBeenCalledTimes(1);
    expect(getPublicAuthorName).toHaveBeenCalledWith(ANNA_ID);
    expect(getAuthorPoem).toHaveBeenCalledTimes(1);
    expect(getAuthorPoem).toHaveBeenCalledWith(ANNA_ID, poemId);
    expect(element.props.items.map((item) => item.label)).toEqual([
      "Главная",
      "Наши авторы",
      "Анна Ахматова",
      "Осенний сад",
    ]);
  });

  // implements FR-8 of add-author-poems
  it("renders nothing for a poem page whose poem isn't the author's", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: true, name: "Анна Ахматова" });
    vi.mocked(getAuthorPoem).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(load(["authors", ANNA_ID, "poems", "no-such-poem"])).resolves.toBeNull();
    expect(getAuthorPoem).toHaveBeenCalledWith(ANNA_ID, "no-such-poem");
  });

  // implements FR-8, FR-12 of add-author-poems
  it("ends on «Автор» for a poem page when the author is unavailable and the poem isn't found", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: false, reason: "unavailable" });
    vi.mocked(getAuthorPoem).mockResolvedValue({ ok: false, reason: "not-found" });

    const element = (await load(["authors", ANNA_ID, "poems", "no-such-poem"])) as ReactElement<{
      items: { label: string }[];
    }>;

    expect(element.props.items.map((item) => item.label)).toEqual(["Главная", "Наши авторы", "Автор"]);
  });

  // implements FR-8 of add-author-poems
  it("reads no poem on an author page", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: true, name: "Анна Ахматова" });

    await load(["authors", ANNA_ID]);

    expect(getAuthorPoem).not.toHaveBeenCalled();
  });

  // implements FR-8 of add-poem-creation
  it("reads the owner's poem title for the owner's poem page, never the session gate", async () => {
    const authorId = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
    const poemId = "30000000-0000-4000-8000-000000000021";
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "public", authorId });
    vi.mocked(getAuthorPoem).mockResolvedValue({
      ok: true,
      poem: {
        id: poemId,
        title: "Первый снег",
        text: "Строка",
        illustrationUrl: null,
        publishedAt: "2026-10-29",
        genreId: null,
      },
    });

    const element = (await load(["account", "poems", poemId])) as ReactElement<{
      items: { label: string }[];
    }>;

    expect(getAuthorPoem).toHaveBeenCalledWith(authorId, poemId);
    expect(requireSession).not.toHaveBeenCalled();
    expect(getPublicAuthorName).not.toHaveBeenCalled();
    expect(element.props.items.map((item) => item.label)).toEqual([
      "Главная",
      "Мастерская поэта",
      "Управление произведениями",
      "Первый снег",
    ]);
  });

  // implements FR-8 of add-poem-creation
  it("renders nothing for another author's poem on the owner's poem page", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({
      ok: true,
      status: "public",
      authorId: "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b",
    });
    vi.mocked(getAuthorPoem).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(load(["account", "poems", "30000000-0000-4000-8000-000000000031"])).resolves.toBeNull();
  });

  // implements FR-17 of add-poem-collections
  it("reads the collection title for its edit page and links the title to the collection page", async () => {
    const collectionId = "40000000-0000-4000-8000-000000000041";
    vi.mocked(getOwnCollectionTitle).mockResolvedValue({ ok: true, title: "Осенний цикл" });

    const element = (await load(["account", "poems", "collections", collectionId, "edit"])) as ReactElement<{
      items: unknown;
    }>;

    expect(getOwnCollectionTitle).toHaveBeenCalledWith(collectionId);
    expect(requireSession).not.toHaveBeenCalled();
    expect(element.props.items).toEqual([
      { kind: "link", label: "Главная", href: "/" },
      { kind: "link", label: "Мастерская поэта", href: "/account" },
      { kind: "link", label: "Управление произведениями", href: "/account/poems" },
      { kind: "link", label: "Осенний цикл", href: `/account/poems/collections/${collectionId}` },
      { kind: "current", label: "Редактирование" },
    ]);
  });

  // implements FR-14 of add-poems-to-collections
  it("reads the collection title for its poems page and ends the trail on «Произведения сборника»", async () => {
    const collectionId = "40000000-0000-4000-8000-000000000041";
    vi.mocked(getOwnCollectionTitle).mockResolvedValue({ ok: true, title: "Осенний цикл" });

    const element = (await load(["account", "poems", "collections", collectionId, "poems"])) as ReactElement<{
      items: unknown;
    }>;

    expect(getOwnCollectionTitle).toHaveBeenCalledWith(collectionId);
    expect(element.props.items).toEqual([
      { kind: "link", label: "Главная", href: "/" },
      { kind: "link", label: "Мастерская поэта", href: "/account" },
      { kind: "link", label: "Управление произведениями", href: "/account/poems" },
      { kind: "link", label: "Осенний цикл", href: `/account/poems/collections/${collectionId}` },
      { kind: "current", label: "Произведения сборника" },
    ]);
  });

  // implements FR-14 of add-poems-to-collections
  it("renders nothing on the poems page of another author's collection", async () => {
    vi.mocked(getOwnCollectionTitle).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(
      load(["account", "poems", "collections", "40000000-0000-4000-8000-000000000051", "poems"]),
    ).resolves.toBeNull();
  });

  // implements FR-17 of add-poem-collections
  it("renders nothing for another author's collection", async () => {
    vi.mocked(getOwnCollectionTitle).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(load(["account", "poems", "collections", "40000000-0000-4000-8000-000000000051"])).resolves.toBeNull();
  });

  // implements FR-4, FR-6 of add-breadcrumbs
  it("renders nothing for an unknown author or an unknown URL", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(load(["authors", ANNA_ID])).resolves.toBeNull();
    await expect(load(["no-such-page"])).resolves.toBeNull();
  });
});
