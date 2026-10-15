import { siteConfig } from "@/shared/config/site";

import type { GreetingContent, GreetingResult } from "./greeting.types";

/** The CMS greeting's title and message on success; the static `siteConfig` copy for any failure. */
export function resolveGreeting(result: GreetingResult): GreetingContent {
  if (result.ok) {
    return { title: result.greeting.title, message: result.greeting.message };
  }
  return { title: siteConfig.name, message: siteConfig.description };
}
