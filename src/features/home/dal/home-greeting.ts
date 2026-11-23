import "server-only";

import { ContentfulError, contentfulQuery } from "@/shared/lib/contentful";

import { greetingCollectionResponseSchema } from "../model/greeting.schema";
import type { GreetingFailureReason, GreetingKey, GreetingResult } from "../model/greeting.types";

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

// One log line per failure: the key (a public constant that tells the about and closing reads apart), the
// reason and the status; never the title, the message or any secret.
function fail(key: GreetingKey, reason: GreetingFailureReason, status?: number): GreetingResult {
  console.error(
    "[contentful] home greeting failed",
    status === undefined ? { key, reason } : { key, reason, status },
  );
  return { ok: false, reason };
}

/**
 * Loads and validates the greeting with the given key. Contentful failures become
 * `{ ok: false, reason }` results (logged once, without secrets); other errors are rethrown.
 */
export async function getGreetingByKey(key: GreetingKey): Promise<GreetingResult> {
  let data: unknown;
  try {
    // Relies on the client's 60 s + `contentful` tag defaults.
    data = await contentfulQuery(HOME_GREETING_QUERY, { key });
  } catch (error) {
    if (error instanceof ContentfulError) return fail(key, error.kind, statusToLog(error));
    throw error;
  }

  const parsed = greetingCollectionResponseSchema.safeParse(data);
  if (!parsed.success) return fail(key, "validation");

  const [greeting] = parsed.data.greetingCollection.items;
  if (!greeting) return fail(key, "not-found");

  return { ok: true, greeting };
}
