// @vitest-environment node
import { revalidateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import * as routeModule from "../route";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const { POST } = routeModule;
const SECRET = "known-webhook-secret-ABC";
const ENDPOINT = "http://localhost/api/revalidate";

function postWith(headerValue?: string): Request {
  const headers = new Headers();
  if (headerValue !== undefined) headers.set("x-contentful-webhook-secret", headerValue);
  return new Request(ENDPOINT, { method: "POST", headers });
}

describe("POST /api/revalidate", () => {
  let errorSpy: MockInstance<typeof console.error>;

  beforeEach(() => {
    vi.stubEnv("CONTENTFUL_REVALIDATE_SECRET", SECRET);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    errorSpy.mockRestore();
  });

  function expectSecretNowhere(body: unknown): void {
    expect(JSON.stringify(body)).not.toContain(SECRET);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(SECRET);
  }

  // implements FR-9 of add-contentful-home-greeting
  it("expires the contentful tag immediately and returns 200 for a matching secret", async () => {
    const response = await POST(postWith(SECRET));
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ revalidated: true });
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith("contentful", { expire: 0 });
    expectSecretNowhere(body);
  });

  it.each([
    ["a missing header", undefined],
    ["a wrong value", SECRET.replace("A", "B")],
    ["a different-length value", `${SECRET}-extra`],
  ])("returns 401 and expires nothing for %s", async (_label, headerValue) => {
    const response = await POST(postWith(headerValue));
    const body: unknown = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ revalidated: false, error: "unauthorized" });
    expect(revalidateTag).not.toHaveBeenCalled();
    expectSecretNowhere(body);
  });

  // implements NFR-1 of add-contentful-home-greeting
  it.each([
    ["unset, with a header", undefined, "anything"],
    ["empty, with an empty header", "", ""],
  ])("returns 503, logs, and expires nothing when the secret is %s", async (_label, secret, header) => {
    vi.stubEnv("CONTENTFUL_REVALIDATE_SECRET", secret);

    const response = await POST(postWith(header));
    const body: unknown = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ revalidated: false, error: "not-configured" });
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith("[contentful] revalidation secret is not configured");
  });

  it("exports POST and no other method handler, so Next answers 405 otherwise", () => {
    const methods = ["GET", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"];

    expect(Object.keys(routeModule).filter((name) => methods.includes(name))).toEqual([]);
  });
});
