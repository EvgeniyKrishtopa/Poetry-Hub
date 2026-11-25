import { describe, expect, it } from "vitest";

import {
  ACCOUNT_PATH,
  ADMIN_PATH,
  RESET_PASSWORD_PATH,
  SIGN_IN_PATH,
  SIGN_UP_PATH,
} from "@/shared/config/account-paths";
import { ABOUT_PATH, HOME_PATH, PRIVACY_PATH } from "@/shared/config/constants";
import { AUTH_PATH } from "@/shared/lib/seo";

import { buildSitemapEntries } from "../../model/sitemap-entries";
import type { SitemapSource } from "../../model/sitemap.types";

const SITE_URL = "https://example.org";
const AUTHOR_A = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const AUTHOR_B = "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d";
const UNLISTED_AUTHOR = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const POEM_P = "30000000-0000-4000-8000-000000000052";
const POEM_Q = "30000000-0000-4000-8000-000000000053";
const POEM_FREE = "30000000-0000-4000-8000-000000000054";
const POEM_OF_B = "30000000-0000-4000-8000-000000000055";
const UNLISTED_POEM = "30000000-0000-4000-8000-000000000056";
const COLLECTION_C = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";
const UNLISTED_COLLECTION = "6e5d4c3b-2a1f-4e0d-9c8b-7a6f5e4d3c2b";

const PRIVATE_PATHS = [ACCOUNT_PATH, ADMIN_PATH, SIGN_IN_PATH, SIGN_UP_PATH, RESET_PASSWORD_PATH, AUTH_PATH];

function sourceOf(overrides: Partial<SitemapSource>): SitemapSource {
  return { siteUrl: SITE_URL, authorIds: [], poemRefs: [], ...overrides };
}

function urlsOf(source: SitemapSource): string[] {
  return buildSitemapEntries(source).map((entry) => entry.url);
}

describe("buildSitemapEntries", () => {
  // implements FR-9 of seo-metadata
  it("lists the fixed pages first, as absolute URLs", () => {
    expect(urlsOf(sourceOf({}))).toEqual([
      `${SITE_URL}${HOME_PATH}`,
      `${SITE_URL}/authors`,
      `${SITE_URL}${ABOUT_PATH}`,
      `${SITE_URL}${PRIVACY_PATH}`,
    ]);
  });

  // implements FR-9 of seo-metadata
  it("lists a public author, the author's poem and the poem's collection under the site URL", () => {
    const source = sourceOf({
      authorIds: [AUTHOR_A],
      poemRefs: [{ id: POEM_P, authorId: AUTHOR_A, collectionId: COLLECTION_C }],
    });

    const urls = urlsOf(source);

    expect(urls).toContain(`${SITE_URL}/authors/${AUTHOR_A}`);
    expect(urls).toContain(`${SITE_URL}/authors/${AUTHOR_A}/poems/${POEM_P}`);
    expect(urls).toContain(`${SITE_URL}/authors/${AUTHOR_A}/collections/${COLLECTION_C}`);
  });

  // implements FR-9 of seo-metadata
  it("lists a collection once however many poems it holds, and none for a free poem", () => {
    const source = sourceOf({
      authorIds: [AUTHOR_A],
      poemRefs: [
        { id: POEM_P, authorId: AUTHOR_A, collectionId: COLLECTION_C },
        { id: POEM_Q, authorId: AUTHOR_A, collectionId: COLLECTION_C },
        { id: POEM_FREE, authorId: AUTHOR_A, collectionId: null },
      ],
    });

    const urls = urlsOf(source);

    const collectionUrls = urls.filter((url) => url.includes("/collections/"));
    expect(collectionUrls).toEqual([`${SITE_URL}/authors/${AUTHOR_A}/collections/${COLLECTION_C}`]);
    expect(urls).toContain(`${SITE_URL}/authors/${AUTHOR_A}/poems/${POEM_FREE}`);
  });

  // implements FR-9 of seo-metadata
  it("lists no collection page when no poem points at one: an empty collection has no entry", () => {
    const source = sourceOf({
      authorIds: [AUTHOR_A],
      poemRefs: [{ id: POEM_FREE, authorId: AUTHOR_A, collectionId: null }],
    });

    expect(urlsOf(source).filter((url) => url.includes("/collections/"))).toEqual([]);
  });

  // implements FR-9 of seo-metadata
  it("leaves out the poems and collections of an author missing from the authors list, and keeps the listed author's", () => {
    const source = sourceOf({
      authorIds: [AUTHOR_B],
      poemRefs: [
        { id: UNLISTED_POEM, authorId: UNLISTED_AUTHOR, collectionId: UNLISTED_COLLECTION },
        { id: POEM_OF_B, authorId: AUTHOR_B, collectionId: null },
      ],
    });

    const urls = urlsOf(source);

    expect(urls.filter((url) => url.includes(UNLISTED_AUTHOR))).toEqual([]);
    expect(urls).toContain(`${SITE_URL}/authors/${AUTHOR_B}/poems/${POEM_OF_B}`);
  });

  // implements FR-9 of seo-metadata
  // implements FR-13 of password-recovery
  it("never lists an account, admin, sign-in, sign-up, reset-password or auth page", () => {
    const source = sourceOf({
      authorIds: [AUTHOR_A, AUTHOR_B],
      poemRefs: [
        { id: POEM_P, authorId: AUTHOR_A, collectionId: COLLECTION_C },
        { id: POEM_OF_B, authorId: AUTHOR_B, collectionId: null },
      ],
    });

    const paths = urlsOf(source).map((url) => new URL(url).pathname);

    for (const privatePath of PRIVATE_PATHS) {
      expect(paths.filter((path) => path === privatePath || path.startsWith(`${privatePath}/`))).toEqual([]);
    }
  });

  // implements FR-11 of seo-metadata
  it("builds every URL on the given origin", () => {
    const source = sourceOf({ siteUrl: "https://poetry.vercel.app", authorIds: [AUTHOR_A] });

    const urls = urlsOf(source);

    expect(urls.every((url) => url.startsWith("https://poetry.vercel.app/"))).toBe(true);
  });
});
