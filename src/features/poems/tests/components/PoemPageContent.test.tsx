import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import { Suspense, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicAuthorName } from "@/features/authors";

import { PoemPage } from "../../components/PoemPage/PoemPage";
import { PoemPageContent } from "../../components/PoemPageContent/PoemPageContent";
import { PoemView } from "../../components/PoemView/PoemView";
import { getAuthorPoem } from "../../dal/author-poems";
import type { Poem } from "../../model/poem.types";

vi.mock("@/features/authors", () => ({ getPublicAuthorName: vi.fn() }));
vi.mock("../../dal/author-poems", () => ({ getAuthorPoem: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const POEM_ID = "osenniy-sad";

const POEM: Poem = {
  id: POEM_ID,
  title: "Осенний сад",
  text: "Листва ложится на дорожки,",
  illustrationSrc: "/mock-poems/osenniy-sad.svg",
  publishedAt: "2026-03-12",
  genre: "Лирика",
};

function renderContent(poemId = POEM_ID) {
  return PoemPageContent({ authorId: Promise.resolve(AUTHOR_ID), poemId: Promise.resolve(poemId) });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("PoemPageContent", () => {
  // implements FR-4, FR-5 of add-author-poems
  it("renders a found author's poem", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: true, name: "Anna Akhmatova" });
    vi.mocked(getAuthorPoem).mockResolvedValue({ ok: true, poem: POEM });

    const element = (await renderContent()) as ReactElement<{ poem: Poem }>;

    expect(getAuthorPoem).toHaveBeenCalledWith(AUTHOR_ID, POEM_ID);
    expect(element.type).toBe(PoemView);
    expect(element.props.poem).toBe(POEM);
  });

  // implements FR-5 of add-author-poems
  it("calls notFound() for an unknown or malformed author, without reading the poem", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(renderContent()).rejects.toThrow("404");
    expect(notFound).toHaveBeenCalledOnce();
    expect(getAuthorPoem).not.toHaveBeenCalled();
  });

  // implements FR-5 of add-author-poems
  it("calls notFound() for a poem that isn't the author's", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: true, name: "Anna Akhmatova" });
    vi.mocked(getAuthorPoem).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(renderContent("no-such-poem")).rejects.toThrow("404");
    expect(notFound).toHaveBeenCalledOnce();
  });

  // implements FR-5 of add-author-poems
  it("throws to the route's error screen when the author is unavailable", async () => {
    vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: false, reason: "unavailable" });

    await expect(renderContent()).rejects.toThrow("Poem page unavailable");
    expect(notFound).not.toHaveBeenCalled();
  });
});

describe("PoemPage", () => {
  // An async Server Component can't render in jsdom, so this checks the tree the wrapper returns.
  it("streams the content inside Suspense, with illustration, heading, and text skeletons and a loading announcement", () => {
    const authorId = Promise.resolve(AUTHOR_ID);
    const poemId = Promise.resolve(POEM_ID);
    const element = PoemPage({ authorId, poemId });
    expect(element.type).toBe(Suspense);
    const { fallback, children } = element.props as {
      fallback: ReactNode;
      children: ReactElement<{ authorId: unknown; poemId: unknown }>;
    };

    expect(children.type).toBe(PoemPageContent);
    expect(children.props).toEqual({ authorId, poemId });
    const { container } = render(fallback);
    const skeletons = [...container.querySelectorAll("[data-skeleton]")];
    expect(skeletons).toHaveLength(5);
    expect(skeletons[0]).toHaveClass("aspect-video");
    for (const skeleton of skeletons) expect(skeleton.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Загрузка…");
  });
});
