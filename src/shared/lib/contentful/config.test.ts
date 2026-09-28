// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getContentfulConfig } from "./config";
import { ContentfulError } from "./errors";

const SPACE_ID = "abc123space";
const TOKEN = "known-token-string-XYZ";

function captureError(): ContentfulError {
  try {
    getContentfulConfig();
  } catch (error) {
    if (error instanceof ContentfulError) return error;
    throw error;
  }
  throw new Error("expected getContentfulConfig to throw");
}

describe("getContentfulConfig", () => {
  beforeEach(() => {
    vi.stubEnv("CONTENTFUL_SPACE_ID", SPACE_ID);
    vi.stubEnv("CONTENTFUL_ACCESS_TOKEN", TOKEN);
    vi.stubEnv("CONTENTFUL_ENVIRONMENT", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // implements FR-2 of add-contentful-home-greeting
  it("returns the config for valid values", () => {
    vi.stubEnv("CONTENTFUL_ENVIRONMENT", "staging_1.2-x");

    expect(getContentfulConfig()).toEqual({
      spaceId: SPACE_ID,
      accessToken: TOKEN,
      environment: "staging_1.2-x",
    });
  });

  it("names a missing access token", () => {
    vi.stubEnv("CONTENTFUL_ACCESS_TOKEN", undefined);

    const error = captureError();

    expect(error.kind).toBe("config");
    expect(error.message).toContain("CONTENTFUL_ACCESS_TOKEN");
    expect(error.message).not.toContain("CONTENTFUL_SPACE_ID");
  });

  it("rejects a token containing whitespace", () => {
    vi.stubEnv("CONTENTFUL_ACCESS_TOKEN", "two words");

    expect(captureError().message).toContain("CONTENTFUL_ACCESS_TOKEN");
  });

  // implements NFR-1 of add-contentful-home-greeting
  it("names a malformed space ID without leaking either value", () => {
    const malformedSpaceId = "abc 123";
    vi.stubEnv("CONTENTFUL_SPACE_ID", malformedSpaceId);

    const error = captureError();

    expect(error.kind).toBe("config");
    expect(error.message).toContain("CONTENTFUL_SPACE_ID");
    expect(error.message).not.toContain(malformedSpaceId);
    expect(error.message).not.toContain(TOKEN);
    expect(error.cause).toBeUndefined();
  });

  it("names every offending variable at once", () => {
    vi.stubEnv("CONTENTFUL_SPACE_ID", undefined);
    vi.stubEnv("CONTENTFUL_ACCESS_TOKEN", "");

    const { message } = captureError();

    expect(message).toContain("CONTENTFUL_SPACE_ID");
    expect(message).toContain("CONTENTFUL_ACCESS_TOKEN");
  });

  it.each([
    ["unset", undefined],
    ["empty", ""],
  ])("defaults the environment to master when %s", (_label, value) => {
    vi.stubEnv("CONTENTFUL_ENVIRONMENT", value);

    expect(getContentfulConfig().environment).toBe("master");
  });

  it("names a malformed environment without its value", () => {
    const malformedEnvironment = "staging env/1";
    vi.stubEnv("CONTENTFUL_ENVIRONMENT", malformedEnvironment);

    const error = captureError();

    expect(error.kind).toBe("config");
    expect(error.message).toContain("CONTENTFUL_ENVIRONMENT");
    expect(error.message).not.toContain(malformedEnvironment);
  });

  it("reads the environment lazily on every call", () => {
    expect(getContentfulConfig().spaceId).toBe(SPACE_ID);

    vi.stubEnv("CONTENTFUL_SPACE_ID", "otherspace");

    expect(getContentfulConfig().spaceId).toBe("otherspace");
  });
});
