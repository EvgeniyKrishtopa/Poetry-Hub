import { Suspense, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/features/auth";
import { PoemArticle, PoemPageSkeleton, type Poem } from "@/features/poems";

import { CreatedPoemNotice } from "../../components/CreatedPoemNotice/CreatedPoemNotice";
import { OwnPoemContent } from "../../components/OwnPoemContent/OwnPoemContent";
import { OwnPoemPage } from "../../components/OwnPoemPage/OwnPoemPage";
import { getOwnPoem } from "../../dal/own-poem";

vi.mock("@/features/auth", () => ({ requireSession: vi.fn() }));
vi.mock("@/features/poems", () => ({ PoemArticle: vi.fn(), PoemPageSkeleton: vi.fn() }));
vi.mock("../../dal/own-poem", () => ({ getOwnPoem: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const POEM_ID = "30000000-0000-4000-8000-000000000021";
const POEM: Poem = {
  id: POEM_ID,
  title: "Осенний сад",
  text: "строка",
  illustrationUrl: null,
  publishedAt: "2026-10-01",
  genreId: null,
};

type ContentElement = ReactElement<{ children: [ReactElement<{ poemId: string }>, ReactElement<{ poem: Poem }>] }>;

async function content(): Promise<ContentElement> {
  return (await OwnPoemContent({ poemId: Promise.resolve(POEM_ID) })) as ContentElement;
}

beforeEach(() => {
  vi.mocked(requireSession).mockResolvedValue({ state: "signed-in", userId: USER_ID });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("OwnPoemContent", () => {
  // An async Server Component can't render in jsdom, so these check the tree it returns.
  // implements FR-7, FR-5 of add-poem-creation
  it("renders the created-poem notice for this id above the poem's shared article", async () => {
    vi.mocked(getOwnPoem).mockResolvedValue({ ok: true, poem: POEM });

    const [notice, article] = (await content()).props.children;

    expect(getOwnPoem).toHaveBeenCalledExactlyOnceWith(POEM_ID);
    expect(notice.type).toBe(CreatedPoemNotice);
    expect(notice.props.poemId).toBe(POEM_ID);
    expect(article.type).toBe(PoemArticle);
    expect(article.props.poem).toBe(POEM);
  });

  // implements FR-7 of add-poem-creation
  it("renders the 404 page for a poem that isn't the author's own", async () => {
    vi.mocked(getOwnPoem).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(content()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  // implements FR-7 of add-poem-creation
  it("throws to the error screen when the poem can't be read", async () => {
    vi.mocked(getOwnPoem).mockResolvedValue({ ok: false, reason: "unavailable" });

    await expect(content()).rejects.toThrow("Own poem page unavailable");
  });

  // implements FR-7 of add-poem-creation
  it("reads nothing when the session gate redirects", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    vi.mocked(requireSession).mockRejectedValue(redirect);

    await expect(content()).rejects.toBe(redirect);
    expect(getOwnPoem).not.toHaveBeenCalled();
  });
});

describe("OwnPoemPage", () => {
  // implements FR-7, FR-13 of add-poem-creation
  it("streams the poem behind the public poem page's skeleton, on a lang=ru root", () => {
    const poemId = Promise.resolve(POEM_ID);
    const element = OwnPoemPage({ poemId }) as ReactElement<{
      lang: string;
      children: ReactElement<{ fallback: ReactElement; children: ReactElement<{ poemId: Promise<string> }> }>;
    }>;

    expect(element.props.lang).toBe("ru");
    const boundary = element.props.children;
    expect(boundary.type).toBe(Suspense);
    expect(boundary.props.fallback.type).toBe(PoemPageSkeleton);
    expect(boundary.props.children.type).toBe(OwnPoemContent);
    expect(boundary.props.children.props.poemId).toBe(poemId);
  });
});
