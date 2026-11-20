// @vitest-environment node
import { notFound } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPublicAuthorName } from "@/features/authors";
import { DESCRIPTION_MAX_LENGTH, FALLBACK_METADATA, TITLE_TEMPLATE } from "@/shared/lib/seo";
import { DEFAULT_SHARE_IMAGE_PATH, OG_LOCALE, SITE_URL_ENV } from "@/shared/lib/seo/seo.constants";

import { getAuthorPoem } from "../../dal/author-poems";
import { getPoemPageMetadata } from "../../metadata/poem-page-metadata";
import { getPoemFallbackDescription } from "../../model/poems-messages";
import type { Poem } from "../../model/poem.types";
import { AUTUMN_GARDEN, FIXTURE_AUTHOR_ID, NIGHT_STATION } from "../poem-fixtures";

vi.mock("@/features/authors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/authors")>()),
  getPublicAuthorName: vi.fn(),
}));
vi.mock("../../dal/author-poems", () => ({ getAuthorPoem: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

const SITE_URL = "https://example.org";
const AUTHOR_NAME = "Анна Иванова";
const LONG_WORD = "слово";
const LONG_WORD_COUNT = 100;
const SECRET_FIELD = "private-field-value";

const authorMock = vi.mocked(getPublicAuthorName);
const poemMock = vi.mocked(getAuthorPoem);

function mockOkReads(poem: Poem) {
  authorMock.mockResolvedValue({ ok: true, name: AUTHOR_NAME });
  poemMock.mockResolvedValue({ ok: true, poem });
}

/** A poem whose text throws when read: stands for any exception in the metadata module's own code. */
function poemWhoseTextThrows(): Poem {
  const poem = { ...AUTUMN_GARDEN };
  Object.defineProperty(poem, "text", {
    get() {
      throw new Error("text failed");
    },
  });
  return poem;
}

describe("getPoemPageMetadata", () => {
  beforeEach(() => {
    vi.stubEnv(SITE_URL_ENV, SITE_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  // implements FR-1, FR-2, FR-4, NFR-1 of seo-metadata
  it("builds the title as poem then author and reads the author and the poem once each, as the page does", async () => {
    mockOkReads(AUTUMN_GARDEN);

    const metadata = await getPoemPageMetadata(FIXTURE_AUTHOR_ID, AUTUMN_GARDEN.id);

    expect(authorMock).toHaveBeenCalledExactlyOnceWith(FIXTURE_AUTHOR_ID);
    expect(poemMock).toHaveBeenCalledExactlyOnceWith(FIXTURE_AUTHOR_ID, AUTUMN_GARDEN.id);
    const title = `${AUTUMN_GARDEN.title} — ${AUTHOR_NAME}`;
    expect(metadata.title).toBe(title);
    expect(metadata.openGraph).toMatchObject({ type: "article", title, locale: OG_LOCALE });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image", title });
    expect(TITLE_TEMPLATE.replace("%s", title)).toBe(`${title} | Поэтический Хаб`);
  });

  // implements FR-2 of seo-metadata
  it("takes the description from the first lines of the poem's text, with no Markdown", async () => {
    const markdownPoem: Poem = { ...NIGHT_STATION, text: "**Табло** мигает,\n\n> тихо\n\n* * *\n\nПоследний поезд." };
    mockOkReads(markdownPoem);

    const metadata = await getPoemPageMetadata(FIXTURE_AUTHOR_ID, markdownPoem.id);

    expect(metadata.description).toBe("Табло мигает, тихо Последний поезд.");
    expect(metadata.openGraph?.description).toBe(metadata.description);
  });

  // implements FR-2 of seo-metadata
  it("shortens a long text to the description limit", async () => {
    const longPoem: Poem = { ...NIGHT_STATION, text: Array.from({ length: LONG_WORD_COUNT }, () => LONG_WORD).join(" ") };
    mockOkReads(longPoem);

    const metadata = await getPoemPageMetadata(FIXTURE_AUTHOR_ID, longPoem.id);

    expect(metadata.description?.length).toBeLessThanOrEqual(DESCRIPTION_MAX_LENGTH);
    expect(metadata.description?.endsWith("…")).toBe(true);
  });

  // implements FR-2 of seo-metadata: a text of only Markdown syntax leaves nothing to excerpt
  it("uses the fixed sentence naming the poem and its author when the text is only syntax", async () => {
    const separatorOnly: Poem = { ...NIGHT_STATION, text: "* * *" };
    mockOkReads(separatorOnly);

    const metadata = await getPoemPageMetadata(FIXTURE_AUTHOR_ID, separatorOnly.id);

    expect(metadata.description).toBe(getPoemFallbackDescription(separatorOnly.title, AUTHOR_NAME));
  });

  // implements FR-2 of seo-metadata: the sentence names a title of up to 80 characters, so it is bounded too
  it("keeps the fixed sentence within the description limit for a long title", async () => {
    const longTitle = "я".repeat(DESCRIPTION_MAX_LENGTH);
    const separatorOnly: Poem = { ...NIGHT_STATION, title: longTitle, text: "* * *" };
    mockOkReads(separatorOnly);

    const metadata = await getPoemPageMetadata(FIXTURE_AUTHOR_ID, separatorOnly.id);

    expect(metadata.description?.length).toBeLessThanOrEqual(DESCRIPTION_MAX_LENGTH);
  });

  // implements FR-3 of seo-metadata
  it("declares the canonical as /authors/<author id>/poems/<poem id>", async () => {
    mockOkReads(AUTUMN_GARDEN);

    const metadata = await getPoemPageMetadata(FIXTURE_AUTHOR_ID, AUTUMN_GARDEN.id);

    const expectedUrl = `${SITE_URL}/authors/${FIXTURE_AUTHOR_ID}/poems/${AUTUMN_GARDEN.id}`;
    expect(metadata.alternates?.canonical).toBe(expectedUrl);
    expect(metadata.openGraph?.url).toBe(expectedUrl);
  });

  // implements FR-3 of seo-metadata
  it("declares the lowercase author id when the request spells it in uppercase", async () => {
    mockOkReads(AUTUMN_GARDEN);

    const metadata = await getPoemPageMetadata(FIXTURE_AUTHOR_ID.toUpperCase(), AUTUMN_GARDEN.id);

    expect(metadata.alternates?.canonical).toBe(
      `${SITE_URL}/authors/${FIXTURE_AUTHOR_ID}/poems/${AUTUMN_GARDEN.id}`,
    );
  });

  // implements FR-5 of seo-metadata
  it("shares the poem's illustration when it has one", async () => {
    mockOkReads(AUTUMN_GARDEN);

    const metadata = await getPoemPageMetadata(FIXTURE_AUTHOR_ID, AUTUMN_GARDEN.id);

    expect(metadata.openGraph?.images).toEqual([AUTUMN_GARDEN.illustrationUrl]);
    expect(metadata.twitter?.images).toEqual([AUTUMN_GARDEN.illustrationUrl]);
  });

  // implements FR-5 of seo-metadata
  it("shares the default image when the poem has no illustration", async () => {
    mockOkReads(NIGHT_STATION);

    const metadata = await getPoemPageMetadata(FIXTURE_AUTHOR_ID, NIGHT_STATION.id);

    const defaultImage = `${SITE_URL}${DEFAULT_SHARE_IMAGE_PATH}`;
    expect(metadata.openGraph?.images).toEqual([defaultImage]);
    expect(metadata.twitter?.images).toEqual([defaultImage]);
  });

  // implements FR-10 of seo-metadata
  it("calls notFound() for an unknown author, without reading the poem", async () => {
    authorMock.mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(getPoemPageMetadata(FIXTURE_AUTHOR_ID, AUTUMN_GARDEN.id)).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
    expect(notFound).toHaveBeenCalledOnce();
    expect(poemMock).not.toHaveBeenCalled();
  });

  // implements FR-10 of seo-metadata
  it("calls notFound() for a removed poem, so the page is marked noindex", async () => {
    authorMock.mockResolvedValue({ ok: true, name: AUTHOR_NAME });
    poemMock.mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(getPoemPageMetadata(FIXTURE_AUTHOR_ID, AUTUMN_GARDEN.id)).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
    expect(notFound).toHaveBeenCalledOnce();
  });

  // implements FR-1, FR-10 of seo-metadata: a failed read is not a missing page
  it("returns the site's fallback when the author read fails, never notFound()", async () => {
    authorMock.mockResolvedValue({ ok: false, reason: "unavailable" });

    const metadata = await getPoemPageMetadata(FIXTURE_AUTHOR_ID, AUTUMN_GARDEN.id);

    expect(metadata).toBe(FALLBACK_METADATA);
    expect(notFound).not.toHaveBeenCalled();
  });

  // implements FR-1, FR-10 of seo-metadata: a failed read is not a missing page
  it("returns the site's fallback when the poem read fails, never notFound()", async () => {
    authorMock.mockResolvedValue({ ok: true, name: AUTHOR_NAME });
    poemMock.mockResolvedValue({ ok: false, reason: "unavailable" });

    const metadata = await getPoemPageMetadata(FIXTURE_AUTHOR_ID, AUTUMN_GARDEN.id);

    expect(metadata).toBe(FALLBACK_METADATA);
    expect(notFound).not.toHaveBeenCalled();
  });

  // implements FR-1 of seo-metadata
  it("returns the site's fallback, and does not throw, when building the metadata throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockOkReads(poemWhoseTextThrows());

    const metadata = await getPoemPageMetadata(FIXTURE_AUTHOR_ID, AUTUMN_GARDEN.id);

    expect(metadata).toBe(FALLBACK_METADATA);
    expect(notFound).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledExactlyOnceWith("[poems] build poem page metadata failed: Error");
    consoleError.mockRestore();
  });

  // implements NFR-2 of seo-metadata
  it("carries only the public fields, never a field the row might hold besides them", async () => {
    mockOkReads(Object.assign({}, AUTUMN_GARDEN, { privateNote: SECRET_FIELD }));

    const metadata = await getPoemPageMetadata(FIXTURE_AUTHOR_ID, AUTUMN_GARDEN.id);

    expect(JSON.stringify(metadata)).not.toContain(SECRET_FIELD);
  });
});
