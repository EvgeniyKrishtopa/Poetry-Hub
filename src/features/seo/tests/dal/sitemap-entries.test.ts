// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { listPublicAuthors } from "@/features/authors";
import { listPublicPoemRefs } from "@/features/poems";
import { getSiteUrl } from "@/shared/lib/seo";

import { getSitemapEntries } from "../../dal/sitemap-entries";

vi.mock("@/features/authors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/authors")>()),
  listPublicAuthors: vi.fn(),
}));
vi.mock("@/features/poems", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/poems")>()),
  listPublicPoemRefs: vi.fn(),
}));
vi.mock("@/shared/lib/seo", () => ({ getSiteUrl: vi.fn() }));

const SITE_URL = "https://example.org";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const POEM_ID = "30000000-0000-4000-8000-000000000052";
const COLLECTION_ID = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";

const AUTHOR = { id: AUTHOR_ID, firstName: "Ольга", lastName: "Северина", about: null, photoUrl: null };
const AUTHORS_OK = { ok: true, authors: [AUTHOR] } as const;
const REFS_OK = { ok: true, refs: [{ id: POEM_ID, authorId: AUTHOR_ID, collectionId: COLLECTION_ID }] } as const;
const UNAVAILABLE = { ok: false, reason: "unavailable" } as const;

function givenReads(authors: Awaited<ReturnType<typeof listPublicAuthors>>, refs: Awaited<ReturnType<typeof listPublicPoemRefs>>) {
  vi.mocked(getSiteUrl).mockReturnValue(SITE_URL);
  vi.mocked(listPublicAuthors).mockResolvedValue(authors);
  vi.mocked(listPublicPoemRefs).mockResolvedValue(refs);
}

describe("getSitemapEntries", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-9 of seo-metadata
  it("builds the entries from both reads on the site URL", async () => {
    givenReads(AUTHORS_OK, REFS_OK);

    const entries = await getSitemapEntries();

    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain(`${SITE_URL}/authors/${AUTHOR_ID}`);
    expect(urls).toContain(`${SITE_URL}/authors/${AUTHOR_ID}/poems/${POEM_ID}`);
    expect(urls).toContain(`${SITE_URL}/authors/${AUTHOR_ID}/collections/${COLLECTION_ID}`);
  });

  // implements FR-9 of seo-metadata
  it("throws when the poems read is unavailable, so the route never serves a partial sitemap", async () => {
    givenReads(AUTHORS_OK, UNAVAILABLE);

    await expect(getSitemapEntries()).rejects.toThrow("Sitemap source unavailable: public poem refs");
  });

  // implements FR-9 of seo-metadata
  it("throws when the authors read is unavailable", async () => {
    givenReads(UNAVAILABLE, REFS_OK);

    await expect(getSitemapEntries()).rejects.toThrow("Sitemap source unavailable: public authors");
  });
});
