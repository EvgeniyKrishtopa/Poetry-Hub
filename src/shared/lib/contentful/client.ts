import "server-only";

/** Tag applied to every Contentful fetch; the publish webhook expires it. */
export const CONTENTFUL_CACHE_TAG = "contentful";

export interface ContentfulCacheOptions {
  /** Seconds; defaults to 60. */
  readonly revalidate?: number;
  /** Extra tags; `CONTENTFUL_CACHE_TAG` is always added. */
  readonly tags?: readonly string[];
}

/**
 * Executes a GraphQL query against the Contentful Content API and resolves with the
 * unvalidated `data` object. Rejects with `ContentfulError` (network → auth → graphql → http).
 */
export async function contentfulQuery(
  query: string,
  variables: Readonly<Record<string, unknown>>,
  cache?: ContentfulCacheOptions,
): Promise<unknown> {
  throw new Error("not implemented");
}
