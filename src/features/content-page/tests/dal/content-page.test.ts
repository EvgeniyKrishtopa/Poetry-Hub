// @vitest-environment node
import { cacheLife, cacheTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CONTENTFUL_CACHE_TAG,
  ContentfulError,
  type ContentfulErrorKind,
  contentfulQuery,
} from "@/shared/lib/contentful";

import { getContentPage } from "../../dal/content-page";
import { CONTENT_PAGE_KEYS } from "../../model/content-page.constants";

vi.mock("@/shared/lib/contentful", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/contentful")>()),
  contentfulQuery: vi.fn(),
}));

const LOG_PREFIX = "[contentful] content page failed";
const SECRET = "secret-token-should-never-leak";
const queryMock = vi.mocked(contentfulQuery);

function itemsResponse(items: unknown[]) {
  return { greetingCollection: { items } };
}

describe.each(Object.values(CONTENT_PAGE_KEYS))("getContentPage(%s)", (key) => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    queryMock.mockReset();
    vi.mocked(cacheLife).mockClear();
    vi.mocked(cacheTag).mockClear();
    logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  function expectSingleLog(expected: { reason: string; status?: number }) {
    expect(logSpy).toHaveBeenCalledExactlyOnceWith(LOG_PREFIX, { key, ...expected });
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain(SECRET);
  }

  function expectFailureCaching() {
    expect(cacheTag).toHaveBeenCalledExactlyOnceWith(CONTENTFUL_CACHE_TAG);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
  }

  // implements FR-1, FR-6, NFR-2 of add-privacy-policy-page
  it("queries its own key and returns the trimmed entry, cached for minutes", async () => {
    queryMock.mockResolvedValue(itemsResponse([{ key, title: "  Title  ", message: " First.\n\nSecond. " }]));

    await expect(getContentPage(key)).resolves.toEqual({
      ok: true,
      entry: { key, title: "Title", message: "First.\n\nSecond." },
    });
    expect(queryMock).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("greetingCollection"), { key });
    expect(logSpy).not.toHaveBeenCalled();
    expect(cacheTag).toHaveBeenCalledExactlyOnceWith(CONTENTFUL_CACHE_TAG);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith("minutes");
  });

  // implements FR-2, FR-6, NFR-2 of add-privacy-policy-page
  it.each<[ContentfulErrorKind, number | undefined, { reason: string; status?: number }]>([
    ["config", undefined, { reason: "config" }],
    ["network", undefined, { reason: "network" }],
    ["auth", 401, { reason: "auth", status: 401 }],
    ["graphql", 400, { reason: "graphql" }],
    ["http", 500, { reason: "http", status: 500 }],
  ])("maps a `%s` ContentfulError to its failure reason", async (kind, status, expectedLog) => {
    queryMock.mockRejectedValue(new ContentfulError(kind, `failed near ${SECRET}`, { status }));

    await expect(getContentPage(key)).resolves.toEqual({ ok: false, reason: kind });
    expectSingleLog(expectedLog);
    expectFailureCaching();
  });

  // implements FR-2, FR-6, NFR-2 of add-privacy-policy-page
  it.each([
    ["an item with a whitespace-only title", itemsResponse([{ key, title: "  ", message: SECRET }])],
    ["an item without a message", itemsResponse([{ key, title: SECRET }])],
    ["data without the greeting collection", { somethingElse: SECRET }],
  ])("returns a validation failure for %s", async (_label, data) => {
    queryMock.mockResolvedValue(data);

    await expect(getContentPage(key)).resolves.toEqual({ ok: false, reason: "validation" });
    expectSingleLog({ reason: "validation" });
    expectFailureCaching();
  });

  // implements FR-2, FR-6, NFR-2 of add-privacy-policy-page
  it("returns not-found for an empty items list", async () => {
    queryMock.mockResolvedValue(itemsResponse([]));

    await expect(getContentPage(key)).resolves.toEqual({ ok: false, reason: "not-found" });
    expectSingleLog({ reason: "not-found" });
    expectFailureCaching();
  });

  // implements NFR-2 of add-privacy-policy-page
  it("rethrows errors that are not Contentful failures, without logging", async () => {
    const bug = new TypeError("programming bug");
    queryMock.mockRejectedValue(bug);

    await expect(getContentPage(key)).rejects.toBe(bug);
    expect(logSpy).not.toHaveBeenCalled();
    expect(cacheTag).toHaveBeenCalledExactlyOnceWith(CONTENTFUL_CACHE_TAG);
    expect(cacheLife).not.toHaveBeenCalled();
  });
});
