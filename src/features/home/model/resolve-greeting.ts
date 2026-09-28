import type { Greeting } from "./greeting.schema";
import type { GreetingResult } from "./greeting.types";

/** The CMS greeting on success; the static `siteConfig` copy for any failure. */
export function resolveGreeting(result: GreetingResult): Greeting {
  throw new Error("not implemented");
}
