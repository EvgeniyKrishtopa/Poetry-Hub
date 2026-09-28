import type { GreetingContent, GreetingResult } from "./greeting.types";

/** The CMS greeting's title and message on success; the static `siteConfig` copy for any failure. */
export function resolveGreeting(result: GreetingResult): GreetingContent {
  throw new Error("not implemented");
}
