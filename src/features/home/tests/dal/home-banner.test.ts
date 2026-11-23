// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONTENTFUL_IMAGE_HOST } from "@/shared/config/contentful-image-patterns";
import {
  ContentfulError,
  type ContentfulErrorKind,
  contentfulQuery,
  getContentfulSpaceId,
} from "@/shared/lib/contentful";

import { getHomeBanner } from "../../dal/home-banner";

vi.mock("@/shared/lib/contentful", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/contentful")>()),
  contentfulQuery: vi.fn(),
  getContentfulSpaceId: vi.fn(),
}));

const SPACE_ID = "abc123space";
const SECRET = "secret-token-should-never-leak";
const IMAGE_URL = `https://${CONTENTFUL_IMAGE_HOST}/${SPACE_ID}/asset-id/token/hero.jpg`;
const queryMock = vi.mocked(contentfulQuery);
const spaceIdMock = vi.mocked(getContentfulSpaceId);

function bannerItem(overrides: Record<string, unknown> = {}) {
  return {
    title: "Welcome",
    description: "Poetry for readers",
    bannerImage: { url: IMAGE_URL },
    ...overrides,
  };
}

function itemsResponse(items: unknown[]) {
  return { homeBannerCollection: { items } };
}

describe("getHomeBanner", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    queryMock.mockReset();
    spaceIdMock.mockReset();
    spaceIdMock.mockReturnValue(SPACE_ID);
    logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  function expectSingleLog(expected: { reason: string; status?: number }) {
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("[contentful] home banner failed", expected);
    const logged = JSON.stringify(logSpy.mock.calls);
    expect(logged).not.toContain(SECRET);
    expect(logged).not.toContain("Welcome");
    expect(logged).not.toContain("Poetry for readers");
    expect(logged).not.toContain(CONTENTFUL_IMAGE_HOST);
  }

  // implements FR-B1 of home-contentful-content
  it("returns the banner's title, description and image address", async () => {
    queryMock.mockResolvedValue(itemsResponse([bannerItem()]));

    await expect(getHomeBanner()).resolves.toEqual({
      ok: true,
      banner: { title: "Welcome", description: "Poetry for readers", bannerImage: IMAGE_URL },
    });
    expect(logSpy).not.toHaveBeenCalled();
  });

  // implements FR-B1 of home-contentful-content
  it("asks for the most recently published entry and uses the first item", async () => {
    queryMock.mockResolvedValue(itemsResponse([bannerItem({ title: "Newer" }), bannerItem({ title: "Older" })]));

    const result = await getHomeBanner();

    expect(result).toMatchObject({ ok: true, banner: { title: "Newer" } });
    const [query] = queryMock.mock.calls[0];
    expect(query).toContain("homeBannerCollection(limit: 1, order: sys_publishedAt_DESC)");
  });

  // implements NFR-B1 of home-contentful-content
  it("sends the query through the client's default cached path, with no cache options of its own", async () => {
    queryMock.mockResolvedValue(itemsResponse([bannerItem()]));

    await getHomeBanner();

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("homeBannerCollection"), {});
    expect(queryMock.mock.calls[0]).toHaveLength(2);
  });

  // implements FR-B1 of home-contentful-content
  it("returns not-found when no entry is published", async () => {
    queryMock.mockResolvedValue(itemsResponse([]));

    await expect(getHomeBanner()).resolves.toEqual({ ok: false, reason: "not-found" });
    expectSingleLog({ reason: "not-found" });
  });

  // implements FR-B2 of home-contentful-content
  it.each([
    ["a missing image", itemsResponse([bannerItem({ bannerImage: null })])],
    ["a blank title", itemsResponse([bannerItem({ title: "   " })])],
    ["a blank description", itemsResponse([bannerItem({ description: " \n " })])],
    ["a missing title", itemsResponse([bannerItem({ title: null })])],
    [
      "an image on another host",
      itemsResponse([bannerItem({ bannerImage: { url: `https://example.com/${SPACE_ID}/hero.jpg` } })]),
    ],
    [
      "an image from another space",
      itemsResponse([
        bannerItem({ bannerImage: { url: `https://${CONTENTFUL_IMAGE_HOST}/otherspace/asset/token/hero.jpg` } }),
      ]),
    ],
    [
      "an image over http",
      itemsResponse([
        bannerItem({ bannerImage: { url: `http://${CONTENTFUL_IMAGE_HOST}/${SPACE_ID}/asset/token/hero.jpg` } }),
      ]),
    ],
    ["data without the banner collection", { somethingElse: SECRET }],
  ])("returns a validation failure with no banner for %s", async (_label, data) => {
    queryMock.mockResolvedValue(data);

    const result = await getHomeBanner();

    expect(result).toEqual({ ok: false, reason: "validation" });
    expect(result).not.toHaveProperty("banner");
    expectSingleLog({ reason: "validation" });
  });

  // implements FR-B2 of home-contentful-content
  it("passes the trimmed title and description to the page", async () => {
    queryMock.mockResolvedValue(itemsResponse([bannerItem({ title: "  Welcome  ", description: "\nPoetry for readers\n" })]));

    await expect(getHomeBanner()).resolves.toMatchObject({
      ok: true,
      banner: { title: "Welcome", description: "Poetry for readers" },
    });
  });

  // implements FR-B2 of home-contentful-content
  it("returns a config failure and sends no request when the space id is unset", async () => {
    spaceIdMock.mockImplementation(() => {
      throw new ContentfulError("config", "Invalid Contentful configuration: CONTENTFUL_SPACE_ID");
    });

    await expect(getHomeBanner()).resolves.toEqual({ ok: false, reason: "config" });
    expect(queryMock).not.toHaveBeenCalled();
    expectSingleLog({ reason: "config" });
  });

  // implements FR-B3 of home-contentful-content
  it.each<[ContentfulErrorKind, number | undefined, { reason: string; status?: number }]>([
    ["config", undefined, { reason: "config" }],
    ["network", undefined, { reason: "network" }],
    ["auth", 401, { reason: "auth", status: 401 }],
    ["http", 500, { reason: "http", status: 500 }],
    ["graphql", 400, { reason: "graphql" }],
  ])("maps a `%s` ContentfulError to a failure result", async (kind, status, expectedLog) => {
    queryMock.mockRejectedValue(new ContentfulError(kind, `failed near ${SECRET}`, { status }));

    await expect(getHomeBanner()).resolves.toEqual({ ok: false, reason: kind });
    expectSingleLog(expectedLog);
  });

  // implements FR-B3 of home-contentful-content
  it("rethrows errors that are not Contentful failures", async () => {
    const bug = new TypeError("programming bug");
    queryMock.mockRejectedValue(bug);

    await expect(getHomeBanner()).rejects.toBe(bug);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
