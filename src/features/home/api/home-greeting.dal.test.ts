// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContentfulError, type ContentfulErrorKind, contentfulQuery } from "@/shared/lib/contentful";

import { getHomeGreeting } from "./home-greeting.dal";

vi.mock("@/shared/lib/contentful", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/contentful")>()),
  contentfulQuery: vi.fn(),
}));

const TOKEN = "secret-token-should-never-leak";
const queryMock = vi.mocked(contentfulQuery);

function itemsResponse(items: unknown[]) {
  return { greetingCollection: { items } };
}

describe("getHomeGreeting", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    queryMock.mockReset();
    logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  function expectSingleLog(expected: { reason: string; status?: number }) {
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("[contentful] home greeting failed", expected);
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain(TOKEN);
  }

  // implements FR-5 of add-contentful-home-greeting
  it("queries the `home` key with the client's cache defaults and returns the greeting", async () => {
    queryMock.mockResolvedValue(
      itemsResponse([{ key: "home", title: " Welcome to Poetry Hub ", message: "Hello, reader." }]),
    );

    await expect(getHomeGreeting()).resolves.toEqual({
      ok: true,
      greeting: { key: "home", title: "Welcome to Poetry Hub", message: "Hello, reader." },
    });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("greetingCollection"), { key: "home" });
    expect(queryMock.mock.calls[0]).toHaveLength(2);
    expect(logSpy).not.toHaveBeenCalled();
  });

  // implements FR-5 of add-contentful-home-greeting
  it("returns not-found for an empty items list", async () => {
    queryMock.mockResolvedValue(itemsResponse([]));

    await expect(getHomeGreeting()).resolves.toEqual({ ok: false, reason: "not-found" });
    expectSingleLog({ reason: "not-found" });
  });

  // implements FR-4 of add-contentful-home-greeting
  it.each([
    ["an item without a title", itemsResponse([{ key: "home", message: TOKEN }])],
    ["a whitespace-only title", itemsResponse([{ key: "home", title: "   ", message: "Hello" }])],
    ["data without the greeting collection", { somethingElse: TOKEN }],
  ])("returns a validation failure with no greeting for %s", async (_label, data) => {
    queryMock.mockResolvedValue(data);

    const result = await getHomeGreeting();

    expect(result).toEqual({ ok: false, reason: "validation" });
    expect(result).not.toHaveProperty("greeting");
    expectSingleLog({ reason: "validation" });
  });

  // implements FR-3 of add-contentful-home-greeting
  // implements FR-7 of add-contentful-home-greeting
  // implements NFR-1 of add-contentful-home-greeting
  it.each<[ContentfulErrorKind, number | undefined, { reason: string; status?: number }]>([
    ["config", undefined, { reason: "config" }],
    ["network", undefined, { reason: "network" }],
    ["auth", 401, { reason: "auth", status: 401 }],
    ["http", 500, { reason: "http", status: 500 }],
    ["graphql", 400, { reason: "graphql" }],
  ])("maps a `%s` ContentfulError to a failure result", async (kind, status, expectedLog) => {
    queryMock.mockRejectedValue(new ContentfulError(kind, `failed near ${TOKEN}`, { status }));

    await expect(getHomeGreeting()).resolves.toEqual({ ok: false, reason: kind });
    expectSingleLog(expectedLog);
  });

  it("rethrows errors that are not Contentful failures", async () => {
    const bug = new TypeError("programming bug");
    queryMock.mockRejectedValue(bug);

    await expect(getHomeGreeting()).rejects.toBe(bug);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
