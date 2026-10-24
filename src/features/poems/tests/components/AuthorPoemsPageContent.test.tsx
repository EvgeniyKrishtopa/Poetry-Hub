import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import { Suspense, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicAuthorName } from "@/features/authors";

import { AuthorPoemList } from "../../components/AuthorPoemList/AuthorPoemList";
import { AuthorPoemsPage } from "../../components/AuthorPoemsPage/AuthorPoemsPage";
import { AuthorPoemsPageContent } from "../../components/AuthorPoemsPageContent/AuthorPoemsPageContent";
import { listAuthorPoems } from "../../dal/author-poems";
import type { Poem } from "../../model/poem.types";

vi.mock("@/features/authors", () => ({ getPublicAuthorName: vi.fn() }));
vi.mock("../../dal/author-poems", () => ({ listAuthorPoems: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

const POEM: Poem = {
  id: "osenniy-sad",
  title: "Осенний сад",
  text: "Листва ложится на дорожки,",
  illustrationSrc: "/mock-poems/osenniy-sad.svg",
  publishedAt: "2026-03-12",
  genre: "Лирика",
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("AuthorPoemsPageContent", () => {
  // implements FR-2, FR-5 of add-author-poems
  it("lists a found author's poems", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: true, name: "Anna Akhmatova" });
    vi.mocked(listAuthorPoems).mockResolvedValue([POEM]);

    const element = (await AuthorPoemsPageContent({ authorId: Promise.resolve(AUTHOR_ID) })) as ReactElement<{
      authorId: string;
      poems: readonly Poem[];
    }>;

    expect(getPublicAuthorName).toHaveBeenCalledWith(AUTHOR_ID);
    expect(listAuthorPoems).toHaveBeenCalledWith(AUTHOR_ID);
    expect(element.type).toBe(AuthorPoemList);
    expect(element.props).toEqual({ authorId: AUTHOR_ID, poems: [POEM] });
  });

  // implements FR-5 of add-author-poems
  it("calls notFound() for an unknown or malformed author, without reading poems", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(AuthorPoemsPageContent({ authorId: Promise.resolve("not-a-uuid") })).rejects.toThrow("404");
    expect(notFound).toHaveBeenCalledOnce();
    expect(listAuthorPoems).not.toHaveBeenCalled();
  });

  // implements FR-5 of add-author-poems
  it("throws to the route's error screen when the author is unavailable", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: false, reason: "unavailable" });

    await expect(AuthorPoemsPageContent({ authorId: Promise.resolve(AUTHOR_ID) })).rejects.toThrow(
      "Author poems page unavailable",
    );
    expect(notFound).not.toHaveBeenCalled();
  });
});

describe("AuthorPoemsPage", () => {
  // An async Server Component can't render in jsdom, so this checks the tree the wrapper returns.
  it("streams the content inside Suspense, with a heading and three title skeletons and a loading announcement", () => {
    const authorId = Promise.resolve(AUTHOR_ID);
    const element = AuthorPoemsPage({ authorId });
    expect(element.type).toBe(Suspense);
    const { fallback, children } = element.props as {
      fallback: ReactNode;
      children: ReactElement<{ authorId: unknown }>;
    };

    expect(children.type).toBe(AuthorPoemsPageContent);
    expect(children.props.authorId).toBe(authorId);
    const { container } = render(fallback);
    const skeletons = [...container.querySelectorAll("[data-skeleton]")];
    expect(skeletons).toHaveLength(4);
    for (const skeleton of skeletons) expect(skeleton.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Загрузка…");
  });
});
