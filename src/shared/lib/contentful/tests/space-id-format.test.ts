// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildContentfulImagePatterns } from "@/shared/config/contentful-image-patterns";

import { getContentfulConfig } from "../config";
import { ContentfulError } from "../errors";

const TOKEN = "known-token-string-XYZ";

function clientAccepts(spaceId: string): boolean {
  vi.stubEnv("CONTENTFUL_SPACE_ID", spaceId);
  vi.stubEnv("CONTENTFUL_ACCESS_TOKEN", TOKEN);
  vi.stubEnv("CONTENTFUL_ENVIRONMENT", undefined);
  try {
    getContentfulConfig();
    return true;
  } catch (error) {
    if (error instanceof ContentfulError) return false;
    throw error;
  }
}

function imagePatternAccepts(spaceId: string): boolean {
  return buildContentfulImagePatterns(spaceId).length > 0;
}

// The space-id format is written twice: the client's config (server-only) and the image-pattern builder, which
// `next.config.ts` loads and so cannot import it. This test is what keeps the two copies from drifting.
describe("the space id format", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // implements FR-B2 of home-contentful-content
  it.each([
    ["lower-case letters and digits", "abc123def", true],
    ["digits only", "123456", true],
    ["upper-case letters", "ABC123", false],
    ["a space", "abc 123", false],
    ["a dash", "abc-123", false],
    ["a slash", "abc/123", false],
    ["a dot", "abc.123", false],
  ])("treats %s the same in the client and in the image patterns", (_case, spaceId, valid) => {
    expect(clientAccepts(spaceId)).toBe(valid);
    expect(imagePatternAccepts(spaceId)).toBe(valid);
  });
});
