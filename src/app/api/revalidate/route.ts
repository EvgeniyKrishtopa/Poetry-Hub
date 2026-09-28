/**
 * Contentful publish webhook. Only POST is exported, so Next answers 405 for other methods.
 * ok → revalidateTag(CONTENTFUL_CACHE_TAG, { expire: 0 }) + 200; unauthorized → 401; not-configured → 503.
 */
export async function POST(request: Request): Promise<Response> {
  throw new Error("not implemented");
}
