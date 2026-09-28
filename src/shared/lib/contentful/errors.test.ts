// @vitest-environment node
import { describe, expect, it } from "vitest";

import { ContentfulError, type ContentfulErrorKind } from "./errors";

const KINDS: readonly ContentfulErrorKind[] = ["config", "network", "auth", "graphql", "http"];

describe("ContentfulError", () => {
  it.each(KINDS)("is constructible with kind %s", (kind) => {
    const error = new ContentfulError(kind, `failed: ${kind}`);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ContentfulError);
    expect(error.name).toBe("ContentfulError");
    expect(error.kind).toBe(kind);
    expect(error.message).toBe(`failed: ${kind}`);
  });

  it("carries the HTTP status and cause when given", () => {
    const cause = new Error("socket hang up");
    const error = new ContentfulError("http", "Contentful responded 500", { status: 500, cause });

    expect(error.status).toBe(500);
    expect(error.cause).toBe(cause);
  });

  it("leaves status undefined when none is given", () => {
    expect(new ContentfulError("network", "request failed").status).toBeUndefined();
  });

  // implements NFR-1 of add-contentful-home-greeting
  it("does not copy a secret carried by the cause into its message", () => {
    const secret = "secret-token-value-123";
    const error = new ContentfulError("network", "Contentful request failed", {
      cause: new Error(`Authorization: Bearer ${secret}`),
    });

    expect(error.message).not.toContain(secret);
    expect(String(error)).not.toContain(secret);
  });
});
