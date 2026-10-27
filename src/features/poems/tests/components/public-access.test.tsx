import { render } from "@testing-library/react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPublicAuthorName } from "@/features/authors";

import { AuthorPoemsEntry } from "../../components/AuthorPoemsEntry/AuthorPoemsEntry";
import { PoemPageContent } from "../../components/PoemPageContent/PoemPageContent";
import { listAuthorPoems } from "../../dal/author-poems";

// Only the authors boundary is stubbed: no session, auth, or Supabase module is mocked or set up,
// and the real poems DAL runs. A component that needed a session would fail or redirect here.
vi.mock("@/features/authors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/authors")>()),
  getPublicAuthorName: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

/** An author whose id gives all four mock poems. */
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

type Render = () => Promise<ReactNode>;

/** Each view, how to render it, and a piece of markup that only its content has. */
const PUBLIC_VIEWS: readonly (readonly [string, Render, string])[] = [
  ["AuthorPoemsEntry", () => AuthorPoemsEntry({ authorId: Promise.resolve(AUTHOR_ID) }), "<li>"],
  [
    "PoemPageContent",
    async () => {
      const [poem] = await listAuthorPoems(AUTHOR_ID);
      return PoemPageContent({ authorId: Promise.resolve(AUTHOR_ID), poemId: Promise.resolve(poem.id) });
    },
    "<time ",
  ],
];

async function renderedHtml(renderView: Render): Promise<string> {
  const { container, unmount } = render(await renderView());
  const html = container.innerHTML;
  unmount();
  return html;
}

beforeEach(() => {
  vi.mocked(getPublicAuthorName).mockResolvedValue({ ok: true, name: "Anna Akhmatova" });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("public access to the poems views", () => {
  it("uses an author who has poems", async () => {
    await expect(listAuthorPoems(AUTHOR_ID)).resolves.not.toHaveLength(0);
  });

  // implements FR-6 of add-author-poems
  it.each(PUBLIC_VIEWS)(
    "%s renders its content with no session, without redirecting",
    async (_name, renderView, contentMarkup) => {
      const html = await renderedHtml(renderView);

      expect(html).toContain(contentMarkup);
      expect(redirect).not.toHaveBeenCalled();
    },
  );

  // implements FR-6 of add-author-poems
  it.each(PUBLIC_VIEWS)("%s gives the same output on two renders", async (_name, renderView) => {
    const first = await renderedHtml(renderView);
    const second = await renderedHtml(renderView);

    expect(second).toBe(first);
  });
});
