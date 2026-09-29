import "server-only";

import { z } from "zod";

import { getContentfulConfig } from "./config";
import { ContentfulError } from "./errors";

/** Tag applied to every Contentful fetch; the publish webhook expires it. */
export const CONTENTFUL_CACHE_TAG = "contentful";

export interface ContentfulCacheOptions {
  /** Seconds; defaults to 60. */
  readonly revalidate?: number;
  /** Extra tags; `CONTENTFUL_CACHE_TAG` is always added. */
  readonly tags?: readonly string[];
}

const DEFAULT_REVALIDATE_SECONDS = 60;
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
 * Executes a GraphQL query against the Contentful Content API and resolves with the
 * unvalidated `data` object. Rejects with `ContentfulError` (network → auth → graphql → http).
 */
// implements FR-1 of add-contentful-home-greeting (server-only via the import above)
// implements FR-3 of add-contentful-home-greeting
export async function contentfulQuery(
  query: string,
  variables: Readonly<Record<string, unknown>>,
  cache?: ContentfulCacheOptions,
): Promise<unknown> {
  const { spaceId, accessToken, environment } = getContentfulConfig();

  // implements NFR-2 of add-contentful-home-greeting: always cached, always tagged `contentful`
  const tags = [...new Set([...(cache?.tags ?? []), CONTENTFUL_CACHE_TAG])];

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
      next: { revalidate: cache?.revalidate ?? DEFAULT_REVALIDATE_SECONDS, tags },
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
