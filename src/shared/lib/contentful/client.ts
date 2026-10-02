import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";

import { getContentfulConfig } from "./config";
import { ContentfulError, type ContentfulErrorKind } from "./errors";

/** Tag applied to every Contentful fetch; the publish webhook expires it. */
export const CONTENTFUL_CACHE_TAG = "contentful";

export interface ContentfulCacheOptions {
  /** Seconds; defaults to 60. */
  readonly revalidate?: number;
  /** Extra tags; `CONTENTFUL_CACHE_TAG` is always added. */
  readonly tags?: readonly string[];
}

const DEFAULT_REVALIDATE_SECONDS = 60;
/** Same 1 h as the built-in `"minutes"` profile, so an idle hour ends in a blocking refetch. */
const CONTENTFUL_CACHE_EXPIRE_SECONDS = 3600;
const REQUEST_TIMEOUT_MS = 5_000;

const graphqlEnvelopeSchema = z.object({
  data: z.unknown().optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

function isNonNullObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

/** Sends the request and reads the body; anything that rejects here is a `network` failure. */
async function send(
  url: string,
  init: RequestInit,
): Promise<{ status: number; ok: boolean; body: string }> {
  try {
    const response = await fetch(url, init);
    return { status: response.status, ok: response.ok, body: await response.text() };
  } catch (cause) {
    throw new ContentfulError("network", "Contentful request failed or timed out", { cause });
  }
}

/**
 * What crosses the `"use cache"` boundary: a plain object, because a thrown class instance
 * is not guaranteed to keep its identity through cache serialization (design D1).
 */
type ContentfulOutcome =
  | { readonly ok: true; readonly data: object }
  | {
      readonly ok: false;
      readonly kind: ContentfulErrorKind;
      readonly message: string;
      readonly status?: number;
    };

/** Reads the config, sends the query, and parses the response; rejects with `ContentfulError`. */
async function requestContentful(
  query: string,
  variables: Readonly<Record<string, unknown>>,
): Promise<object> {
  const { spaceId, accessToken, environment } = getContentfulConfig();

  // implements NFR-1 of add-contentful-home-greeting: the token appears only in this header
  const { status, ok, body } = await send(
    `https://graphql.contentful.com/content/v1/spaces/${spaceId}/environments/${environment}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  if (status === 401 || status === 403) {
    throw new ContentfulError("auth", `Contentful rejected the access token (HTTP ${status})`, {
      status,
    });
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    throw new ContentfulError("http", `Contentful returned a non-JSON body (HTTP ${status})`, {
      status,
    });
  }

  const envelope = graphqlEnvelopeSchema.safeParse(json);
  if (!envelope.success) {
    throw new ContentfulError("http", `Contentful returned an invalid GraphQL response (HTTP ${status})`, {
      status,
    });
  }

  const { data, errors } = envelope.data;
  if (errors && errors.length > 0) {
    const messages = errors.map((error) => error.message).join("; ");
    throw new ContentfulError("graphql", `Contentful GraphQL error: ${messages}`, { status });
  }

  if (!ok) {
    throw new ContentfulError("http", `Contentful responded with HTTP ${status}`, { status });
  }

  if (!isNonNullObject(data)) {
    throw new ContentfulError("http", `Contentful returned no data (HTTP ${status})`, { status });
  }

  return data;
}

/**
 * The cached scope. Failures are returned, not thrown, so they are cached for the same lifetime
 * as a success (implements FR-3 of migrate-to-cache-components). The token is read inside,
 * never passed as an argument, so it never becomes part of the cache key.
 */
// implements FR-2 of migrate-to-cache-components
async function cachedContentfulRequest(
  query: string,
  variables: Readonly<Record<string, unknown>>,
  revalidateSeconds: number,
  tags: readonly string[],
): Promise<ContentfulOutcome> {
  "use cache";
  cacheLife({ revalidate: revalidateSeconds, expire: CONTENTFUL_CACHE_EXPIRE_SECONDS });
  cacheTag(...tags);

  try {
    return { ok: true, data: await requestContentful(query, variables) };
  } catch (error) {
    if (!(error instanceof ContentfulError)) throw error;
    return { ok: false, kind: error.kind, message: error.message, status: error.status };
  }
}

/**
 * Executes a GraphQL query against the Contentful Content API and resolves with the
 * unvalidated `data` object. Rejects with `ContentfulError` (network → auth → graphql → http),
 * rebuilt outside the cache scope and therefore without a `cause`.
 */
// implements FR-1 of add-contentful-home-greeting (server-only via the import above)
// implements FR-3 of add-contentful-home-greeting
// implements FR-3 of migrate-to-cache-components
export async function contentfulQuery(
  query: string,
  variables: Readonly<Record<string, unknown>>,
  cache?: ContentfulCacheOptions,
): Promise<unknown> {
  // implements NFR-2 of add-contentful-home-greeting: always cached, always tagged `contentful`
  const tags = [...new Set([...(cache?.tags ?? []), CONTENTFUL_CACHE_TAG])];

  const outcome = await cachedContentfulRequest(
    query,
    variables,
    cache?.revalidate ?? DEFAULT_REVALIDATE_SECONDS,
    tags,
  );
  if (!outcome.ok) {
    throw new ContentfulError(outcome.kind, outcome.message, { status: outcome.status });
  }
  return outcome.data;
}
