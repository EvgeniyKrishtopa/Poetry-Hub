import "server-only";

import { ContentfulError, contentfulQuery } from "@/shared/lib/contentful";

import { greetingCollectionResponseSchema } from "../model/greeting.schema";
import type { GreetingFailureReason, GreetingResult } from "../model/greeting.types";

const HOME_GREETING_KEY = "home";

const HOME_GREETING_QUERY = /* GraphQL */ `
  query HomeGreeting($key: String!) {
    greetingCollection(where: { key: $key }, limit: 1) {
      items {
        key
        title
        message
      }
    }
  }
`;

/** Only `auth` and `http` statuses are worth logging; the rest carry none or add nothing. */
function statusToLog(error: ContentfulError): number | undefined {
  return error.kind === "auth" || error.kind === "http" ? error.status : undefined;
}

// implements FR-7 of add-contentful-home-greeting: one log line per failure, no payloads
// implements NFR-1 of add-contentful-home-greeting: only the reason and status are logged, never secrets
function fail(reason: GreetingFailureReason, status?: number): GreetingResult {
  console.error("[contentful] home greeting failed", status === undefined ? { reason } : { reason, status });
  return { ok: false, reason };
}

/**
 * Loads and validates the greeting with key "home". Contentful failures become
 * `{ ok: false, reason }` results (logged once, without secrets); other errors are rethrown.
 */
// implements FR-3 of add-contentful-home-greeting: Contentful failures are results, not exceptions
export async function getHomeGreeting(): Promise<GreetingResult> {
  let data: unknown;
  try {
    // implements NFR-2 of add-contentful-home-greeting: relies on the client's 60 s + `contentful` tag defaults
    data = await contentfulQuery(HOME_GREETING_QUERY, { key: HOME_GREETING_KEY });
  } catch (error) {
    if (error instanceof ContentfulError) return fail(error.kind, statusToLog(error));
    throw error;
  }

  // implements FR-4 of add-contentful-home-greeting
  const parsed = greetingCollectionResponseSchema.safeParse(data);
  if (!parsed.success) return fail("validation");

  // implements FR-5 of add-contentful-home-greeting
  const [greeting] = parsed.data.greetingCollection.items;
  if (!greeting) return fail("not-found");

  return { ok: true, greeting };
}
