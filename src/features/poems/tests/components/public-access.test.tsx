import { render } from "@testing-library/react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPublicAuthorName } from "@/features/authors";
import { createSupabasePublicClient } from "@/shared/lib/supabase/public";

import { AuthorPoemsEntry } from "../../components/AuthorPoemsEntry/AuthorPoemsEntry";
import { PoemPageContent } from "../../components/PoemPageContent/PoemPageContent";
import { listAuthorPoems } from "../../dal/author-poems";
import { createFakePublicClient, okResponse } from "../dal/fake-public-client";

// Only the authors boundary and the cookie-less public client are stubbed: no session, auth, or
// cookie-reading Supabase module is mocked or set up, and the real poems DAL runs. A component that
// needed a session would fail or redirect here.
vi.mock("@/features/authors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/authors")>()),
  getPublicAuthorName: vi.fn(),
}));
vi.mock("@/shared/lib/supabase/public", () => ({ createSupabasePublicClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

/** The author's one stored poem, with no genre, so no Contentful read happens. */
const POEM_ROW = {
  id: "30000000-0000-4000-8000-000000000021",
  title: "Осенний сад",
  text: "Листва ложится на дорожки,",
  genre_id: null,
  illustration_path: null,
  created_at: "2026-03-12T12:00:00+00:00",
};

type Render = () => Promise<ReactNode>;

/** Each view, how to render it, and a piece of markup that only its content has. */
const PUBLIC_VIEWS: readonly (readonly [string, Render, string])[] = [
  ["AuthorPoemsEntry", () => AuthorPoemsEntry({ authorId: Promise.resolve(AUTHOR_ID) }), "<li>"],
  [
    "PoemPageContent",
    async () => {
      return PoemPageContent({ authorId: Promise.resolve(AUTHOR_ID), poemId: Promise.resolve(POEM_ROW.id) });
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
  // A fresh client per read: React's `cache` doesn't memoize in Vitest, so every render reads again.
  vi.mocked(createSupabasePublicClient).mockImplementation(() => {
    const fake = createFakePublicClient();
    fake.queueQuery(okResponse([POEM_ROW]));
    return fake.client;
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("public access to the poems views", () => {
  it("uses an author who has poems", async () => {
    await expect(listAuthorPoems(AUTHOR_ID)).resolves.toMatchObject({ ok: true, poems: [{ id: POEM_ROW.id }] });
  });

  // implements FR-6 of add-author-poems
  // implements NFR-2 of refine-author-page-and-contact
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
