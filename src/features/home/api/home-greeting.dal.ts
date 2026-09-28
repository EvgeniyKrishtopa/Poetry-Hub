import "server-only";

import type { GreetingResult } from "../model/greeting.types";

/**
 * Loads and validates the greeting with key "home". Contentful failures become
 * `{ ok: false, reason }` results (logged once, without secrets); other errors are rethrown.
 */
export async function getHomeGreeting(): Promise<GreetingResult> {
  throw new Error("not implemented");
}
