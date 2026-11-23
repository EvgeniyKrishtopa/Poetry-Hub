// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContentfulError, type ContentfulErrorKind, contentfulQuery } from "@/shared/lib/contentful";

import { getGreetingByKey } from "../../dal/home-greeting";
import type { GreetingKey } from "../../model/greeting.types";
import { ABOUT_GREETING_KEY, JOIN_GREETING_KEY } from "../../model/home.constants";

vi.mock("@/shared/lib/contentful", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/contentful")>()),
  contentfulQuery: vi.fn(),
}));

const TOKEN = "secret-token-should-never-leak";
const queryMock = vi.mocked(contentfulQuery);

function itemsResponse(items: unknown[]) {
  return { greetingCollection: { items } };
}

describe("getGreetingByKey", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    queryMock.mockReset();
    logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  function expectSingleLog(expected: { key: string; reason: string; status?: number }) {
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("[contentful] home greeting failed", expected);
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain(TOKEN);
  }

  // implements home-greeting FR-5 of home-contentful-content
  it.each<GreetingKey>([ABOUT_GREETING_KEY, JOIN_GREETING_KEY])(
    "queries the `%s` key with the client's cache defaults and returns the greeting",
    async (key) => {
      queryMock.mockResolvedValue(
        itemsResponse([{ key, title: " Welcome to Poetry Hub ", message: "Hello, reader." }]),
      );

      await expect(getGreetingByKey(key)).resolves.toEqual({
        ok: true,
        greeting: { key, title: "Welcome to Poetry Hub", message: "Hello, reader." },
      });
      expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("greetingCollection"), { key });
      expect(queryMock.mock.calls[0]).toHaveLength(2);
      expect(logSpy).not.toHaveBeenCalled();
    },
  );

  // implements home-greeting FR-5 of home-contentful-content
  it("returns not-found for a key with no published entry and logs the key", async () => {
    queryMock.mockResolvedValue(itemsResponse([]));

    await expect(getGreetingByKey(JOIN_GREETING_KEY)).resolves.toEqual({ ok: false, reason: "not-found" });
    expectSingleLog({ key: JOIN_GREETING_KEY, reason: "not-found" });
  });

  // implements home-greeting FR-4 of home-contentful-content
  it.each([
    ["an item without a title", itemsResponse([{ key: ABOUT_GREETING_KEY, message: TOKEN }])],
    ["a whitespace-only title", itemsResponse([{ key: ABOUT_GREETING_KEY, title: "   ", message: "Hello" }])],
    ["data without the greeting collection", { somethingElse: TOKEN }],
  ])("returns a validation failure with no greeting for %s", async (_label, data) => {
    queryMock.mockResolvedValue(data);

    const result = await getGreetingByKey(ABOUT_GREETING_KEY);

    expect(result).toEqual({ ok: false, reason: "validation" });
    expect(result).not.toHaveProperty("greeting");
    expectSingleLog({ key: ABOUT_GREETING_KEY, reason: "validation" });
  });

  // implements home-greeting FR-3 and FR-7 of home-contentful-content
  it.each<[ContentfulErrorKind, number | undefined, { reason: string; status?: number }]>([
    ["config", undefined, { reason: "config" }],
    ["network", undefined, { reason: "network" }],
    ["auth", 401, { reason: "auth", status: 401 }],
    ["http", 500, { reason: "http", status: 500 }],
    ["graphql", 400, { reason: "graphql" }],
  ])("maps a `%s` ContentfulError to a failure result", async (kind, status, expectedLog) => {
    queryMock.mockRejectedValue(new ContentfulError(kind, `failed near ${TOKEN}`, { status }));

    await expect(getGreetingByKey(ABOUT_GREETING_KEY)).resolves.toEqual({ ok: false, reason: kind });
    expectSingleLog({ key: ABOUT_GREETING_KEY, ...expectedLog });
  });

  it("rethrows errors that are not Contentful failures", async () => {
    const bug = new TypeError("programming bug");
    queryMock.mockRejectedValue(bug);

    await expect(getGreetingByKey(ABOUT_GREETING_KEY)).rejects.toBe(bug);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
