// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONTENTFUL_CACHE_TAG, contentfulQuery } from "./client";
import { ContentfulError } from "./errors";

const SPACE_ID = "abc123space";
const TOKEN = "known-token-string-XYZ";
const QUERY = "query HomeGreeting($key: String!) { greetingCollection { total } }";
const VARIABLES = { key: "home" };

const fetchMock = vi.fn<typeof fetch>();

function respond(body: string, status = 200): void {
  fetchMock.mockResolvedValueOnce(new Response(body, { status }));
}

function respondJson(body: unknown, status = 200): void {
  respond(JSON.stringify(body), status);
}

async function captureError(): Promise<ContentfulError> {
  const error = await contentfulQuery(QUERY, VARIABLES).catch((caught: unknown) => caught);
  if (error instanceof ContentfulError) return error;
  throw new Error(`expected a ContentfulError, got ${String(error)}`);
}

function lastInit(): RequestInit {
  const init = fetchMock.mock.calls.at(-1)?.[1];
  if (!init) throw new Error("fetch was not called");
  return init;
}

describe("contentfulQuery", () => {
  beforeEach(() => {
    vi.stubEnv("CONTENTFUL_SPACE_ID", SPACE_ID);
    vi.stubEnv("CONTENTFUL_ACCESS_TOKEN", TOKEN);
    vi.stubEnv("CONTENTFUL_ENVIRONMENT", undefined);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("request", () => {
    // implements FR-1 of add-contentful-home-greeting
    it("POSTs the query and variables to the environment endpoint with bearer auth", async () => {
      respondJson({ data: { greetingCollection: { total: 1 } } });

      await contentfulQuery(QUERY, VARIABLES);

      const [url, init] = fetchMock.mock.calls[0] ?? [];
      expect(url).toBe(
        `https://graphql.contentful.com/content/v1/spaces/${SPACE_ID}/environments/master`,
      );
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      });
      expect(JSON.parse(String(init?.body))).toEqual({ query: QUERY, variables: VARIABLES });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    });

    it("targets the configured environment", async () => {
      vi.stubEnv("CONTENTFUL_ENVIRONMENT", "staging");
      respondJson({ data: {} });

      await contentfulQuery(QUERY, VARIABLES);

      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        `https://graphql.contentful.com/content/v1/spaces/${SPACE_ID}/environments/staging`,
      );
    });

    it("sends no request when the configuration is invalid", async () => {
      vi.stubEnv("CONTENTFUL_ACCESS_TOKEN", undefined);

      const error = await captureError();

      expect(error.kind).toBe("config");
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  // implements NFR-2 of add-contentful-home-greeting
  describe("cache options", () => {
    it("defaults to 60 s and the contentful tag", async () => {
      respondJson({ data: {} });

      await contentfulQuery(QUERY, VARIABLES);

      expect(lastInit().next).toEqual({ revalidate: 60, tags: [CONTENTFUL_CACHE_TAG] });
    });

    it("keeps the enforced tag next to caller-supplied settings", async () => {
      respondJson({ data: {} });

      await contentfulQuery(QUERY, VARIABLES, { revalidate: 300, tags: ["poems"] });

      expect(lastInit().next).toEqual({ revalidate: 300, tags: ["poems", "contentful"] });
    });

    it("does not duplicate the contentful tag", async () => {
      respondJson({ data: {} });

      await contentfulQuery(QUERY, VARIABLES, { tags: ["contentful"] });

      expect(lastInit().next).toEqual({ revalidate: 60, tags: ["contentful"] });
    });
  });

  // implements FR-3 of add-contentful-home-greeting
  describe("failure mapping", () => {
    it("maps a rejected fetch to network", async () => {
      fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

      const error = await captureError();

      expect(error.kind).toBe("network");
      expect(error.cause).toBeInstanceOf(TypeError);
    });

    it.each([401, 403])("maps HTTP %i to auth without leaking the token", async (status) => {
      respondJson({ errors: [{ message: "access denied" }] }, status);

      const error = await captureError();

      expect(error.kind).toBe("auth");
      expect(error.status).toBe(status);
      // implements NFR-1 of add-contentful-home-greeting
      expect(error.message).not.toContain(TOKEN);
    });

    it.each([400, 200])("maps errors[] with HTTP %i to graphql with the messages", async (status) => {
      respondJson({ errors: [{ message: "Unknown field" }, { message: "Bad arg" }] }, status);

      const error = await captureError();

      expect(error.kind).toBe("graphql");
      expect(error.message).toContain("Unknown field");
      expect(error.message).toContain("Bad arg");
    });

    it("maps HTTP 500 without GraphQL errors to http", async () => {
      respondJson({ message: "internal" }, 500);

      const error = await captureError();

      expect(error.kind).toBe("http");
      expect(error.status).toBe(500);
    });

    it("maps a non-JSON body to http", async () => {
      respond("<html>Bad gateway</html>", 502);

      const error = await captureError();

      expect(error.kind).toBe("http");
      expect(error.status).toBe(502);
    });

    it("maps a body that is not a GraphQL envelope to http", async () => {
      respondJson({ errors: "nope" });

      const error = await captureError();

      expect(error.kind).toBe("http");
      expect(error.status).toBe(200);
    });

    it.each([
      ["{}", {}],
      ['{ "data": null }', { data: null }],
    ])("maps a 200 with %s to http with status 200", async (_label, body) => {
      respondJson(body);

      const error = await captureError();

      expect(error.kind).toBe("http");
      expect(error.status).toBe(200);
    });
  });

  it("resolves with the data object on success", async () => {
    const data = { greetingCollection: { items: [{ title: "Hi" }] } };
    respondJson({ data });

    await expect(contentfulQuery(QUERY, VARIABLES)).resolves.toEqual(data);
  });
});
