// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  buildContentfulImagePatterns,
  CONTENTFUL_IMAGE_HOST,
  isAllowedContentfulImageUrl,
} from "../contentful-image-patterns";

const SPACE_ID = "abc123def";
const OTHER_SPACE_ID = "zzz999";

function imageUrl(spaceId: string): string {
  return `https://${CONTENTFUL_IMAGE_HOST}/${spaceId}/asset-id/token/hero.jpg`;
}

describe("buildContentfulImagePatterns", () => {
  // implements FR-B2, NFR-B2 of home-contentful-content
  it("allows the image host under the project's space id only", () => {
    const patterns = buildContentfulImagePatterns(SPACE_ID).map((pattern) => pattern.href);

    expect(patterns).toEqual([`https://${CONTENTFUL_IMAGE_HOST}/${SPACE_ID}/**`]);
  });

  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["malformed", "Not A Space!"],
  ])("returns no pattern when the space id is %s, so the build still succeeds", (_case, spaceId) => {
    expect(buildContentfulImagePatterns(spaceId)).toEqual([]);
  });
});

describe("isAllowedContentfulImageUrl", () => {
  // implements FR-B2 of home-contentful-content
  it("accepts an image in the project's space", () => {
    expect(isAllowedContentfulImageUrl(imageUrl(SPACE_ID), SPACE_ID)).toBe(true);
  });

  it.each([
    ["another space", imageUrl(OTHER_SPACE_ID)],
    ["another host", `https://example.com/${SPACE_ID}/asset-id/token/hero.jpg`],
    ["plain http", `http://${CONTENTFUL_IMAGE_HOST}/${SPACE_ID}/asset-id/token/hero.jpg`],
    ["a query string", `${imageUrl(SPACE_ID)}?w=100`],
    ["a path that only starts with the space id", `https://${CONTENTFUL_IMAGE_HOST}/${SPACE_ID}x/asset-id/hero.jpg`],
    ["not a URL", "not a url"],
  ])("refuses an address with %s", (_case, url) => {
    expect(isAllowedContentfulImageUrl(url, SPACE_ID)).toBe(false);
  });

  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["malformed (upper-case letters)", "ABC123"],
    ["malformed (a space)", "abc 123"],
  ])("refuses every address when the space id is %s", (_case, spaceId) => {
    expect(isAllowedContentfulImageUrl(imageUrl(SPACE_ID), spaceId)).toBe(false);
  });

  // The optimizer applies protocol, host, path prefix and query rules; the check must reach the same answer.
  function patternAllows(url: string): boolean {
    const [pattern] = buildContentfulImagePatterns(SPACE_ID);
    const parsed = new URL(url);
    const pathPrefix = pattern.pathname.replace("**", "");
    return (
      parsed.protocol === pattern.protocol &&
      parsed.host === pattern.host &&
      parsed.pathname.startsWith(pathPrefix) &&
      parsed.search === pattern.search
    );
  }

  it.each([
    ["the project's space", imageUrl(SPACE_ID)],
    ["another space", imageUrl(OTHER_SPACE_ID)],
    ["another host", `https://example.com/${SPACE_ID}/asset-id/token/hero.jpg`],
    ["a subdomain of the image host", `https://cdn.${CONTENTFUL_IMAGE_HOST}/${SPACE_ID}/asset-id/token/hero.jpg`],
    ["plain http", `http://${CONTENTFUL_IMAGE_HOST}/${SPACE_ID}/asset-id/token/hero.jpg`],
    ["a query string", `${imageUrl(SPACE_ID)}?w=100`],
  ])("agrees with the pattern for an address on %s", (_case, url) => {
    expect(isAllowedContentfulImageUrl(url, SPACE_ID)).toBe(patternAllows(url));
  });
});
