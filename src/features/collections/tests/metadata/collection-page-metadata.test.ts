// @vitest-environment node
import { notFound } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPublicAuthorName } from "@/features/authors";
import { DESCRIPTION_MAX_LENGTH, FALLBACK_METADATA, TITLE_TEMPLATE } from "@/shared/lib/seo";
import { DEFAULT_SHARE_IMAGE_PATH, OG_LOCALE, SITE_URL_ENV } from "@/shared/lib/seo/seo.constants";

import { getPublicCollection } from "../../dal/public-collections";
import { getPublicCollectionPageMetadata } from "../../metadata/collection-page-metadata";
import { getCollectionFallbackDescription } from "../../model/public-collections-messages";
import type { PublicCollection } from "../../model/public-collections.types";

vi.mock("@/features/authors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/authors")>()),
  getPublicAuthorName: vi.fn(),
}));
vi.mock("../../dal/public-collections", () => ({ getPublicCollection: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

const SITE_URL = "https://example.org";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const COLLECTION_ID = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";
const AUTHOR_NAME = "Анна Иванова";
const COLLECTION_TITLE = "Осень";
const DESCRIPTION = "Стихи о **поздней** осени.\nИ о первом снеге.";
const DESCRIPTION_AS_PLAIN_TEXT = "Стихи о поздней осени. И о первом снеге.";
const LONG_WORD = "слово";
const LONG_WORD_COUNT = 100;
const SECRET_FIELD = "private-field-value";

const AUTUMN: PublicCollection = {
  id: COLLECTION_ID,
  title: COLLECTION_TITLE,
  description: DESCRIPTION,
  poems: [{ id: "30000000-0000-4000-8000-000000000052", title: "Ночной вокзал" }],
};

const authorMock = vi.mocked(getPublicAuthorName);
const collectionMock = vi.mocked(getPublicCollection);

function mockOkReads(collection: PublicCollection) {
  authorMock.mockResolvedValue({ ok: true, name: AUTHOR_NAME });
  collectionMock.mockResolvedValue({ ok: true, collection });
}

/** A collection whose description throws when read: stands for any exception in the metadata module's own code. */
function collectionWhoseDescriptionThrows(): PublicCollection {
  const collection = { ...AUTUMN };
  Object.defineProperty(collection, "description", {
    get() {
      throw new Error("description failed");
    },
  });
  return collection;
}

describe("getPublicCollectionPageMetadata", () => {
  beforeEach(() => {
    vi.stubEnv(SITE_URL_ENV, SITE_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  // implements FR-1, FR-4, NFR-1 of seo-metadata
  it("builds the title as collection then author and reads the author and the collection once each, as the page does", async () => {
    mockOkReads(AUTUMN);

    const metadata = await getPublicCollectionPageMetadata(AUTHOR_ID, COLLECTION_ID);

    expect(authorMock).toHaveBeenCalledExactlyOnceWith(AUTHOR_ID);
    expect(collectionMock).toHaveBeenCalledExactlyOnceWith(AUTHOR_ID, COLLECTION_ID);
    const title = `${COLLECTION_TITLE} — ${AUTHOR_NAME}`;
    expect(metadata.title).toBe(title);
    expect(metadata.openGraph).toMatchObject({ type: "website", title, locale: OG_LOCALE });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image", title });
    expect(TITLE_TEMPLATE.replace("%s", title)).toBe(`${title} | Поэтический Хаб`);
  });

  // implements FR-2 of seo-metadata
  it("takes the description from the collection's own text as plain text", async () => {
    mockOkReads(AUTUMN);

    const metadata = await getPublicCollectionPageMetadata(AUTHOR_ID, COLLECTION_ID);

    expect(metadata.description).toBe(DESCRIPTION_AS_PLAIN_TEXT);
    expect(metadata.openGraph?.description).toBe(DESCRIPTION_AS_PLAIN_TEXT);
  });

  // implements FR-2 of seo-metadata
  it("shortens a long description to the description limit", async () => {
    const longText = Array.from({ length: LONG_WORD_COUNT }, () => LONG_WORD).join(" ");
    mockOkReads({ ...AUTUMN, description: longText });

    const metadata = await getPublicCollectionPageMetadata(AUTHOR_ID, COLLECTION_ID);

    expect(metadata.description?.length).toBeLessThanOrEqual(DESCRIPTION_MAX_LENGTH);
    expect(metadata.description?.endsWith("…")).toBe(true);
  });

  // implements FR-2 of seo-metadata
  it("uses the fixed sentence naming both the collection and its author when there is no description", async () => {
    mockOkReads({ ...AUTUMN, description: null });

    const metadata = await getPublicCollectionPageMetadata(AUTHOR_ID, COLLECTION_ID);

    expect(metadata.description).toBe(getCollectionFallbackDescription(COLLECTION_TITLE, AUTHOR_NAME));
    expect(metadata.description).toContain(COLLECTION_TITLE);
    expect(metadata.description).toContain(AUTHOR_NAME);
  });

  // implements FR-2 of seo-metadata: the sentence names a title of up to 80 characters and a long name, so it is bounded
  it("keeps the fixed sentence within the description limit for a long title", async () => {
    mockOkReads({ ...AUTUMN, title: "я".repeat(DESCRIPTION_MAX_LENGTH), description: null });

    const metadata = await getPublicCollectionPageMetadata(AUTHOR_ID, COLLECTION_ID);

    expect(metadata.description?.length).toBeLessThanOrEqual(DESCRIPTION_MAX_LENGTH);
  });

  // implements FR-3 of seo-metadata
  it("declares the canonical as /authors/<author id>/collections/<collection id>, in lowercase", async () => {
    mockOkReads(AUTUMN);

    const metadata = await getPublicCollectionPageMetadata(AUTHOR_ID.toUpperCase(), COLLECTION_ID);

    const expectedUrl = `${SITE_URL}/authors/${AUTHOR_ID}/collections/${COLLECTION_ID}`;
    expect(metadata.alternates?.canonical).toBe(expectedUrl);
    expect(metadata.openGraph?.url).toBe(expectedUrl);
  });

  // implements FR-5 of seo-metadata
  it("shares the default image", async () => {
    mockOkReads(AUTUMN);

    const metadata = await getPublicCollectionPageMetadata(AUTHOR_ID, COLLECTION_ID);

    const defaultImage = `${SITE_URL}${DEFAULT_SHARE_IMAGE_PATH}`;
    expect(metadata.openGraph?.images).toEqual([defaultImage]);
    expect(metadata.twitter?.images).toEqual([defaultImage]);
  });

  // implements FR-10 of seo-metadata
  it("calls notFound() for an unknown author, without reading the collection", async () => {
    authorMock.mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(getPublicCollectionPageMetadata(AUTHOR_ID, COLLECTION_ID)).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
    expect(notFound).toHaveBeenCalledOnce();
    expect(collectionMock).not.toHaveBeenCalled();
  });

  // implements FR-10 of seo-metadata: the read returns not-found for a collection that is missing, empty or another author's
  it("calls notFound() for an empty, missing or another author's collection, so the page is marked noindex", async () => {
    authorMock.mockResolvedValue({ ok: true, name: AUTHOR_NAME });
    collectionMock.mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(getPublicCollectionPageMetadata(AUTHOR_ID, COLLECTION_ID)).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
    expect(notFound).toHaveBeenCalledOnce();
  });

  // implements FR-1, FR-10 of seo-metadata: a failed read is not a missing page
  it("returns the site's fallback when the author read fails, never notFound()", async () => {
    authorMock.mockResolvedValue({ ok: false, reason: "unavailable" });

    const metadata = await getPublicCollectionPageMetadata(AUTHOR_ID, COLLECTION_ID);

    expect(metadata).toBe(FALLBACK_METADATA);
    expect(notFound).not.toHaveBeenCalled();
  });

  // implements FR-1, FR-10 of seo-metadata: a failed read is not a missing page
  it("returns the site's fallback when the collection read fails, never notFound()", async () => {
    authorMock.mockResolvedValue({ ok: true, name: AUTHOR_NAME });
    collectionMock.mockResolvedValue({ ok: false, reason: "unavailable" });

    const metadata = await getPublicCollectionPageMetadata(AUTHOR_ID, COLLECTION_ID);

    expect(metadata).toBe(FALLBACK_METADATA);
    expect(notFound).not.toHaveBeenCalled();
  });

  // implements FR-1 of seo-metadata
  it("returns the site's fallback, and does not throw, when building the metadata throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockOkReads(collectionWhoseDescriptionThrows());

    const metadata = await getPublicCollectionPageMetadata(AUTHOR_ID, COLLECTION_ID);

    expect(metadata).toBe(FALLBACK_METADATA);
    expect(notFound).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledExactlyOnceWith("[collections] build collection page metadata failed: Error");
    consoleError.mockRestore();
  });

  // implements NFR-2 of seo-metadata
  it("carries only the public fields, never a field the row might hold besides them", async () => {
    mockOkReads(Object.assign({}, AUTUMN, { privateNote: SECRET_FIELD }));

    const metadata = await getPublicCollectionPageMetadata(AUTHOR_ID, COLLECTION_ID);

    expect(JSON.stringify(metadata)).not.toContain(SECRET_FIELD);
  });
});
