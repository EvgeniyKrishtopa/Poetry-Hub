// @vitest-environment node
import { notFound } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DESCRIPTION_MAX_LENGTH, FALLBACK_METADATA, TITLE_TEMPLATE } from "@/shared/lib/seo";
import { DEFAULT_SHARE_IMAGE_PATH, OG_LOCALE, SITE_URL_ENV } from "@/shared/lib/seo/seo.constants";

import { getPublicAuthor } from "../../dal/public-authors";
import { getAuthorPageMetadata } from "../../metadata/author-page-metadata";
import type { PublicAuthor } from "../../model/author.types";
import { getAuthorFallbackDescription } from "../../model/author-messages";

vi.mock("../../dal/public-authors", () => ({ getPublicAuthor: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

const SITE_URL = "https://example.org";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const PHOTO_URL = "https://storage.example.org/author-photos/anna.jpg";
const ABOUT = "**Анна** пишет о городе.\n\n> и об осени";
const ABOUT_AS_PLAIN_TEXT = "Анна пишет о городе. и об осени";
const FULL_NAME = "Анна Иванова";
const LONG_WORD = "слово";
const LONG_WORD_COUNT = 100;
const SECRET_USER_ID = "secret-auth-user-id";

const ANNA: PublicAuthor = {
  id: AUTHOR_ID,
  firstName: "Анна",
  lastName: "Иванова",
  about: ABOUT,
  photoUrl: PHOTO_URL,
};

const readMock = vi.mocked(getPublicAuthor);

/** An author whose about text throws when read: stands for any exception in the metadata module's own code. */
function authorWhoseAboutThrows(): PublicAuthor {
  const author = { ...ANNA };
  Object.defineProperty(author, "about", {
    get() {
      throw new Error("about failed");
    },
  });
  return author;
}

describe("getAuthorPageMetadata", () => {
  beforeEach(() => {
    vi.stubEnv(SITE_URL_ENV, SITE_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  // implements FR-1, FR-2, FR-4, NFR-1 of seo-metadata
  it("builds the title from the full name and the description from the about text as plain text, with one read", async () => {
    readMock.mockResolvedValue({ ok: true, author: ANNA });

    const metadata = await getAuthorPageMetadata(AUTHOR_ID);

    expect(readMock).toHaveBeenCalledExactlyOnceWith(AUTHOR_ID);
    expect(metadata.title).toBe(FULL_NAME);
    expect(metadata.description).toBe(ABOUT_AS_PLAIN_TEXT);
    expect(metadata.openGraph).toMatchObject({
      type: "profile",
      title: FULL_NAME,
      description: ABOUT_AS_PLAIN_TEXT,
      locale: OG_LOCALE,
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image", title: FULL_NAME });
    expect(TITLE_TEMPLATE.replace("%s", FULL_NAME)).toBe(`${FULL_NAME} | Поэтический Хаб`);
  });

  // implements FR-2 of seo-metadata
  it("shortens a long about text to the description limit", async () => {
    const longAbout = Array.from({ length: LONG_WORD_COUNT }, () => LONG_WORD).join(" ");
    readMock.mockResolvedValue({ ok: true, author: { ...ANNA, about: longAbout } });

    const metadata = await getAuthorPageMetadata(AUTHOR_ID);

    expect(metadata.description?.length).toBeLessThanOrEqual(DESCRIPTION_MAX_LENGTH);
    expect(metadata.description?.endsWith("…")).toBe(true);
  });

  // implements FR-2 of seo-metadata
  it.each([
    ["no about text", null],
    ["an about text that is only Markdown syntax", "* * *"],
  ])("uses the fixed sentence naming the author for %s", async (_name, about) => {
    readMock.mockResolvedValue({ ok: true, author: { ...ANNA, about } });

    const metadata = await getAuthorPageMetadata(AUTHOR_ID);

    expect(metadata.description).toBe(getAuthorFallbackDescription(FULL_NAME));
    expect(metadata.description).toContain(FULL_NAME);
  });

  // implements FR-3, FR-4 of seo-metadata: the canonical comes from the read result's lowercase id
  it("declares the canonical and og:url with the lowercase id when the request spells it in uppercase", async () => {
    readMock.mockResolvedValue({ ok: true, author: ANNA });

    const metadata = await getAuthorPageMetadata(AUTHOR_ID.toUpperCase());

    const expectedUrl = `${SITE_URL}/authors/${AUTHOR_ID}`;
    expect(metadata.alternates?.canonical).toBe(expectedUrl);
    expect(metadata.openGraph?.url).toBe(expectedUrl);
  });

  // implements FR-5 of seo-metadata
  it("shares the author's photo, or the default image when there is none", async () => {
    readMock.mockResolvedValue({ ok: true, author: ANNA });
    const withPhoto = await getAuthorPageMetadata(AUTHOR_ID);

    readMock.mockResolvedValue({ ok: true, author: { ...ANNA, photoUrl: null } });
    const withoutPhoto = await getAuthorPageMetadata(AUTHOR_ID);

    expect(withPhoto.openGraph?.images).toEqual([PHOTO_URL]);
    expect(withPhoto.twitter?.images).toEqual([PHOTO_URL]);
    const defaultImage = `${SITE_URL}${DEFAULT_SHARE_IMAGE_PATH}`;
    expect(withoutPhoto.openGraph?.images).toEqual([defaultImage]);
    expect(withoutPhoto.twitter?.images).toEqual([defaultImage]);
  });

  // implements FR-10 of seo-metadata
  it("calls notFound() for an unknown author, so the page is marked noindex", async () => {
    readMock.mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(getAuthorPageMetadata(AUTHOR_ID)).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(notFound).toHaveBeenCalledOnce();
  });

  // implements FR-1, FR-10 of seo-metadata: a failed read is not a missing page
  it("returns the site's fallback for a failed read, never notFound()", async () => {
    readMock.mockResolvedValue({ ok: false, reason: "unavailable" });

    const metadata = await getAuthorPageMetadata(AUTHOR_ID);

    expect(metadata).toBe(FALLBACK_METADATA);
    expect(notFound).not.toHaveBeenCalled();
  });

  // implements FR-1 of seo-metadata
  it("returns the site's fallback, and does not throw, when building the metadata throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    readMock.mockResolvedValue({ ok: true, author: authorWhoseAboutThrows() });

    const metadata = await getAuthorPageMetadata(AUTHOR_ID);

    expect(metadata).toBe(FALLBACK_METADATA);
    expect(notFound).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledExactlyOnceWith("[authors] build author page metadata failed: Error");
    consoleError.mockRestore();
  });

  // implements NFR-2 of seo-metadata
  it("carries only the public fields, never a user id the row might hold", async () => {
    const author = Object.assign({}, ANNA, { userId: SECRET_USER_ID });
    readMock.mockResolvedValue({ ok: true, author });

    const metadata = await getAuthorPageMetadata(AUTHOR_ID);

    expect(JSON.stringify(metadata)).not.toContain(SECRET_USER_ID);
  });
});
